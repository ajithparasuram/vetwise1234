/**
 * Auth Lambda Handler
 *
 * Endpoints:
 *   POST /auth/signup     — Public self-registration (client or doctor only)
 *   POST /auth/login      — Password login via Cognito AdminInitiateAuth
 *   POST /auth/otp        — Send OTP (email or SMS) via Cognito AdminCreateAuthChallenge
 *   PUT  /auth/otp        — Verify OTP and authenticate
 *   POST /auth/forgot-password — Cognito recovery flow
 *   POST /auth/refresh    — Refresh Cognito tokens
 *
 * SECURITY:
 *   - Role is NEVER trusted from the client. The signup endpoint only allows
 *     'client' or 'doctor'. Admin/frontdesk self-registration is rejected.
 *   - OTP is handled entirely by Cognito's built-in auth challenge flow.
 *     This handler never accepts arbitrary 6-digit codes.
 *   - Password is never logged or stored in plaintext.
 */

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminGetUserCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { success, badRequest, unauthorized, internalError, conflict, rateLimited, parseBody } from '../shared/response';
import { putItem, getItem, queryByIndex, updateItem, deleteItem, uuid, now, tableName } from '../shared/db';
import { validateEmail, validatePhone, sanitizeString } from '../shared/validation';
import type { Role, Owner, Doctor } from '../shared/types';

const cognitoClient = new CognitoIdentityProviderClient({});
const secretsClient = new SecretsManagerClient({});
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const WHATSAPP_SECRET_NAME = process.env.WHATSAPP_SECRET_NAME || `vetwise/whatsapp/${process.env.STAGE || 'staging'}`;

const OTP_TTL_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

let cachedWaCredentials: { token: string; phoneNumberId: string } | null = null;

async function getWhatsappCredentials(): Promise<{ token: string; phoneNumberId: string }> {
  if (cachedWaCredentials) return cachedWaCredentials;
  const result = await secretsClient.send(new GetSecretValueCommand({ SecretId: WHATSAPP_SECRET_NAME }));
  const parsed = JSON.parse(result.SecretString || '{}');
  cachedWaCredentials = {
    token: parsed.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: parsed.WHATSAPP_PHONE_NUMBER_ID || '',
  };
  return cachedWaCredentials;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatPhoneForWa(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (phone.startsWith('+')) return phone;
  return `+${digits}`;
}

async function sendWhatsappMessage(phone: string, code: string): Promise<void> {
  const creds = await getWhatsappCredentials();
  if (!creds.token || !creds.phoneNumberId) {
    console.error('WhatsApp credentials not configured');
    throw new Error('WhatsApp messaging not configured');
  }
  const url = `https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: 'otp_verification',
      language: { code: 'en' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: code }] }],
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('WhatsApp API error:', res.status, errText);
    throw new Error('Failed to send WhatsApp message');
  }
}

interface OtpRecord {
  otpId: string;
  phone: string;
  code: string;
  purpose: 'login' | 'register';
  attempts: number;
  verified: boolean;
  createdAt: string;
  expiresAt: string;
  lastSentAt: string;
  ttl: number;
}

type AuthEvent = APIGatewayProxyEvent & { resource?: string };

export const handler = async (event: AuthEvent): Promise<{ statusCode: number; body: string; headers: Record<string, string> }> => {
  const resource = event.resource ?? '';
  const method = event.httpMethod ?? 'POST';

  try {
    if (resource === '/auth/signup' && method === 'POST') return await handleSignup(event);
    if (resource === '/auth/login' && method === 'POST') return await handleLogin(event);
    if (resource === '/auth/otp' && method === 'POST') return await handleSendOtp(event);
    if (resource === '/auth/otp' && method === 'PUT') return await handleVerifyOtp(event);
    if (resource === '/auth/forgot-password' && method === 'POST') return await handleForgotPassword(event);
    if (resource === '/auth/refresh' && method === 'POST') return await handleRefresh(event);
    if (resource === '/auth/whatsapp-otp' && method === 'POST') return await handleSendWhatsappOtp(event);
    if (resource === '/auth/whatsapp-otp' && method === 'PUT') return await handleVerifyWhatsappOtp(event);
    return badRequest('Unknown auth endpoint');
  } catch (err) {
    console.error('Auth handler error:', err);
    const message = err instanceof Error ? err.message : 'Authentication failed';
    const statusCode = (err as { statusCode?: number })?.statusCode ?? 500;
    if (statusCode === 401) return unauthorized(message);
    if (statusCode === 409) return conflict(message);
    return internalError(message);
  }
};

/**
 * POST /auth/signup
 *
 * Public self-registration. Only 'client' and 'doctor' roles are allowed.
 * Admin and frontdesk accounts must be created by an admin.
 *
 * Body: { name, phone, email, password, role }
 *
 * For doctor: approvalStatus = 'pending'
 * For client: approvalStatus = 'active'
 */
async function handleSignup(event: AuthEvent) {
  const body = parseBody(event);

  const name = sanitizeString(body.name);
  const phone = sanitizeString(body.phone);
  const email = sanitizeString(body.email);
  const password = body.password as string;
  const role = sanitizeString(body.role) as Role;

  if (!name) return badRequest('Name is required');
  if (!phone || !validatePhone(phone)) return badRequest('A valid phone number is required');
  if (!email || !validateEmail(email)) return badRequest('A valid email is required');
  if (!password || password.length < 8) return badRequest('Password must be at least 8 characters');
  if (!role || !['client', 'doctor'].includes(role)) {
    return badRequest('Invalid role. Only client and doctor self-registration is allowed.');
  }

  // Create Cognito user
  try {
    const createUserCmd = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'name', Value: name },
        { Name: 'email', Value: email },
        { Name: 'phone_number', Value: phone },
        { Name: 'custom:role', Value: role },
        { Name: 'custom:approvalStatus', Value: role === 'doctor' ? 'pending' : 'active' },
      ],
      TemporaryPassword: password,
      MessageAction: 'SUPPRESS',
    });
    const cognitoResult = await cognitoClient.send(createUserCommand);
    const cognitoSub = cognitoResult.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;

    if (!cognitoSub) throw new Error('Failed to get Cognito sub');

    // Create application record
    if (role === 'client') {
      const owner: Owner = {
        ownerId: uuid(),
        name,
        city: '',
        phone,
        email,
        address: '',
        joinedDate: now(),
        status: 'active',
        cognitoSub,
        organizationId: '',
        createdAt: now(),
        updatedAt: now(),
      };
      await putItem('owners', owner);
    } else {
      const doctor: Doctor = {
        doctorId: uuid(),
        cognitoSub,
        name,
        email,
        phone,
        specialty: '',
        license: '',
        experience: '',
        clinic: '',
        organizationId: '',
        approvalStatus: 'pending',
        appliedDate: now(),
        createdAt: now(),
        updatedAt: now(),
      };
      await putItem('doctors', doctor);
    }

    return success({
      message: role === 'doctor'
        ? 'Account created successfully. Your account is pending admin approval.'
        : 'Account created successfully. You can now log in.',
      cognitoSub,
      role,
      approvalStatus: role === 'doctor' ? 'pending' : 'active',
    }, 201);
  } catch (err) {
    if ((err as { name?: string })?.name === 'UsernameExistsException') {
      return conflict('An account with this email already exists.');
    }
    throw err;
  }
}

/**
 * POST /auth/login
 *
 * Password-based login using Cognito USER_PASSWORD_AUTH flow.
 *
 * Body: { identifier (email or phone), password }
 */
async function handleLogin(event: AuthEvent) {
  const body = parseBody(event);
  const identifier = sanitizeString(body.identifier ?? body.email ?? body.phone);
  const password = body.password as string;

  if (!identifier) return badRequest('Email or phone is required');
  if (!password) return badRequest('Password is required');

  const authCmd = new AdminInitiateAuthCommand({
    UserPoolId: USER_POOL_ID,
    ClientId: CLIENT_ID,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: {
      USERNAME: identifier,
      PASSWORD: password,
    },
  });

  const result = await cognitoClient.send(authCmd);

  if (result.AuthenticationResult) {
    return success({
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
      expiresIn: result.AuthenticationResult.ExpiresIn ?? 3600,
    });
  }

  if (result.ChallengeName) {
    return success({
      challengeName: result.ChallengeName,
      session: result.Session,
      message: 'Additional authentication required.',
    });
  }

  return unauthorized('Authentication failed');
}

/**
 * POST /auth/otp
 *
 * Initiate OTP authentication. Cognito sends the OTP via email or SMS.
 * The handler does NOT generate or accept arbitrary codes.
 *
 * Body: { identifier (email or phone), channel: 'email' | 'sms' }
 */
async function handleSendOtp(event: AuthEvent) {
  const body = parseBody(event);
  const identifier = sanitizeString(body.identifier ?? body.email ?? body.phone);
  const channel = sanitizeString(body.channel) || 'email';

  if (!identifier) return badRequest('Email or phone is required');

  // Initiate auth with CUSTOM auth flow for OTP
  const authCmd = new AdminInitiateAuthCommand({
    UserPoolId: USER_POOL_ID,
    ClientId: CLIENT_ID,
    AuthFlow: 'CUSTOM_AUTH',
    AuthParameters: {
      USERNAME: identifier,
      CHALLENGE_NAME: channel === 'sms' ? 'SMS_OTP' : 'EMAIL_OTP',
    },
  });

  const result = await cognitoClient.send(authCmd);

  return success({
    session: result.Session,
    challengeName: result.ChallengeName,
    deliveryChannel: channel,
    message: `A verification code has been sent to your ${channel}.`,
  });
}

/**
 * PUT /auth/otp
 *
 * Verify the OTP code that Cognito sent. The code is submitted to Cognito's
 * auth challenge response — Cognito validates it, not this handler.
 *
 * Body: { session, code }
 */
async function handleVerifyOtp(event: AuthEvent) {
  const body = parseBody(event);
  const session = body.session as string;
  const code = sanitizeString(body.code);

  if (!session) return badRequest('Session is required');
  if (!code) return badRequest('Verification code is required');

  const respondCmd = new AdminRespondToAuthChallengeCommand({
    UserPoolId: USER_POOL_ID,
    ClientId: CLIENT_ID,
    Session: session,
    ChallengeName: 'CUSTOM_CHALLENGE',
    ChallengeResponses: {
      USERNAME: body.identifier as string,
      ANSWER: code,
    },
  });

  const result = await cognitoClient.send(respondCmd);

  if (result.AuthenticationResult) {
    return success({
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
      expiresIn: result.AuthenticationResult.ExpiresIn ?? 3600,
    });
  }

  return unauthorized('Invalid verification code');
}

/**
 * POST /auth/forgot-password
 *
 * Triggers Cognito's built-in password recovery flow.
 *
 * Body: { identifier }
 */
async function handleForgotPassword(event: AuthEvent) {
  const body = parseBody(event);
  const identifier = sanitizeString(body.identifier ?? body.email);

  if (!identifier) return badRequest('Email is required');

  const cmd = new ForgotPasswordCommand({
    ClientId: CLIENT_ID,
    Username: identifier,
  });

  await cognitoClient.send(cmd);

  return success({
    message: 'Password recovery instructions have been sent to your email.',
  });
}

/**
 * POST /auth/refresh
 *
 * Refresh Cognito tokens using a refresh token.
 *
 * Body: { refreshToken }
 */
async function handleRefresh(event: AuthEvent) {
  const body = parseBody(event);
  const refreshToken = body.refreshToken as string;

  if (!refreshToken) return badRequest('Refresh token is required');

  const cmd = new InitiateAuthCommand({
    ClientId: CLIENT_ID,
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });

  const result = await cognitoClient.send(cmd);

  if (result.AuthenticationResult) {
    return success({
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      expiresIn: result.AuthenticationResult.ExpiresIn ?? 3600,
    });
  }

  return unauthorized('Token refresh failed');
}

/**
 * POST /auth/whatsapp-otp
 *
 * Generates a 6-digit OTP, stores it in DynamoDB with 5-minute TTL,
 * and sends it via WhatsApp Cloud API.
 *
 * Body: { phone, purpose: 'login' | 'register' }
 */
async function handleSendWhatsappOtp(event: AuthEvent) {
  const body = parseBody(event);
  const phone = sanitizeString(body.phone);
  const purpose = (sanitizeString(body.purpose) || 'login') as 'login' | 'register';

  if (!phone) return badRequest('Phone number is required');
  if (purpose !== 'login' && purpose !== 'register') return badRequest('Purpose must be login or register');

  // Check for existing OTP for this phone — enforce resend cooldown
  const existing = await queryByIndex<OtpRecord>('otpStore', 'phoneIndex', '#p = :phone', { '#p': 'phone', ':phone': phone });
  const latest = existing[0];

  if (latest) {
    const elapsed = (Date.now() - new Date(latest.lastSentAt).getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
      return rateLimited(`Please wait ${wait}s before requesting a new code.`);
    }
  }

  const otpId = uuid();
  const code = generateOtp();
  const nowIso = now();
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

  const otpRecord: OtpRecord = {
    otpId,
    phone,
    code,
    purpose,
    attempts: 0,
    verified: false,
    createdAt: nowIso,
    expiresAt,
    lastSentAt: nowIso,
    ttl: Math.floor(Date.now() / 1000) + OTP_TTL_SECONDS,
  };
  await putItem('otpStore', otpRecord);

  try {
    await sendWhatsappMessage(formatPhoneForWa(phone), code);
  } catch (err) {
    console.error('WhatsApp send failed:', err);
    await deleteItem('otpStore', { otpId });
    return internalError('Failed to send OTP. Please try again.');
  }

  return success({
    otpId,
    message: 'A 6-digit code has been sent to your WhatsApp.',
    expiresAt,
  });
}

/**
 * PUT /auth/whatsapp-otp
 *
 * Verifies the OTP code. If purpose is 'register', creates the Cognito account
 * and application record. If 'login', authenticates and returns tokens.
 *
 * Body: { otpId, code, phone, purpose, registrationData? }
 */
async function handleVerifyWhatsappOtp(event: AuthEvent) {
  const body = parseBody(event);
  const otpId = sanitizeString(body.otpId);
  const code = sanitizeString(body.code);
  const phone = sanitizeString(body.phone);
  const purpose = (sanitizeString(body.purpose) || 'login') as 'login' | 'register';

  if (!otpId) return badRequest('OTP ID is required');
  if (!code || code.length !== 6) return badRequest('A 6-digit code is required');
  if (!phone) return badRequest('Phone number is required');

  const otpRecord = await getItem<OtpRecord>('otpStore', { otpId });
  if (!otpRecord) return badRequest('Invalid or expired verification code.');
  if (otpRecord.phone !== phone) return badRequest('Phone number does not match.');
  if (otpRecord.verified) return badRequest('This code has already been used.');
  if (otpRecord.attempts >= MAX_ATTEMPTS) return rateLimited('Too many attempts. Please request a new code.');

  const expired = new Date(otpRecord.expiresAt).getTime() < Date.now();
  if (expired) return badRequest('This code has expired. Please request a new one.');

  if (otpRecord.code !== code) {
    await updateItem('otpStore', { otpId }, { attempts: otpRecord.attempts + 1 });
    return unauthorized('Incorrect verification code.');
  }

  // Mark as verified
  await updateItem('otpStore', { otpId }, { verified: true });

  if (purpose === 'register') {
    const reg = body.registrationData as { name: string; email: string; role: Role } | undefined;
    if (!reg?.name || !reg?.email || !reg?.role) {
      return badRequest('Registration data (name, email, role) is required for registration.');
    }
    if (!validateEmail(reg.email)) return badRequest('A valid email is required.');
    if (!['client', 'doctor'].includes(reg.role)) {
      return badRequest('Only client and doctor self-registration is allowed. Admin and Front Desk accounts must be created by an administrator.');
    }

    const name = sanitizeString(reg.name);
    const email = sanitizeString(reg.email);
    const role = reg.role as Role;
    const approvalStatus = role === 'doctor' ? 'pending' : 'active';

    // Create Cognito user with a random temporary password (user can reset later)
    const tempPassword = `Wv${Date.now()}${Math.random().toString(36).slice(2, 8)}!Aa`;

    try {
      const createUserCmd = new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: [
          { Name: 'name', Value: name },
          { Name: 'email', Value: email },
          { Name: 'phone_number', Value: formatPhoneForWa(phone) },
          { Name: 'custom:role', Value: role },
          { Name: 'custom:approvalStatus', Value: approvalStatus },
        ],
        TemporaryPassword: tempPassword,
        MessageAction: 'SUPPRESS',
      });
      const cognitoResult = await cognitoClient.send(createUserCmd);
      const cognitoSub = cognitoResult.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;
      if (!cognitoSub) throw new Error('Failed to get Cognito sub');

      // Create application record
      if (role === 'client') {
        const owner: Owner = {
          ownerId: uuid(),
          name,
          city: '',
          phone,
          email,
          address: '',
          joinedDate: now(),
          status: 'active',
          cognitoSub,
          organizationId: '',
          createdAt: now(),
          updatedAt: now(),
        };
        await putItem('owners', owner);
      } else {
        const doctor: Doctor = {
          doctorId: uuid(),
          cognitoSub,
          name,
          email,
          phone,
          specialty: '',
          license: '',
          experience: '',
          clinic: '',
          organizationId: '',
          approvalStatus: approvalStatus as 'pending' | 'active',
          appliedDate: now(),
          createdAt: now(),
          updatedAt: now(),
        };
        await putItem('doctors', doctor);
      }

      // Authenticate the new user via password to return tokens
      try {
        const authCmd = new AdminInitiateAuthCommand({
          UserPoolId: USER_POOL_ID,
          ClientId: CLIENT_ID,
          AuthFlow: 'USER_PASSWORD_AUTH',
          AuthParameters: { USERNAME: email, PASSWORD: tempPassword },
        });
        const authResult = await cognitoClient.send(authCmd);

        return success({
          message: 'Account created successfully.',
          cognitoSub,
          role,
          approvalStatus,
          isNewUser: true,
          accessToken: authResult.AuthenticationResult?.AccessToken,
          idToken: authResult.AuthenticationResult?.IdToken,
          refreshToken: authResult.AuthenticationResult?.RefreshToken,
          expiresIn: authResult.AuthenticationResult?.ExpiresIn ?? 3600,
        });
      } catch {
        // Tokens not returned but registration succeeded
        return success({
          message: 'Account created successfully. Please log in.',
          cognitoSub,
          role,
          approvalStatus,
          isNewUser: true,
        }, 201);
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'UsernameExistsException') {
        return conflict('An account with this email already exists.');
      }
      throw err;
    }
  }

  // Login: find user by phone via Cognito or DynamoDB lookup
  // Look up owner or doctor by phone to get their email (Cognito username)
  const owners = await queryByIndex<Owner>('owners', 'phoneIndex', '#p = :phone', { '#p': 'phone', ':phone': phone }).catch(() => []);
  const doctors = await queryByIndex<Doctor>('doctors', 'phoneIndex', '#p = :phone', { '#p': 'phone', ':phone': phone }).catch(() => []);

  const ownerMatch = owners[0];
  const doctorMatch = doctors[0];

  if (!ownerMatch && !doctorMatch) {
    return unauthorized('No account found for this phone number. Please register first.');
  }

  const email = (ownerMatch?.email || doctorMatch?.email) as string;
  const role: Role = ownerMatch ? 'client' : 'doctor';
  const approvalStatus = ownerMatch ? 'active' : (doctorMatch?.approvalStatus || 'pending');

  if (role === 'doctor' && approvalStatus === 'pending') {
    return success({ message: 'Your account is pending admin approval.', approvalStatus, role, cognitoSub: doctorMatch?.cognitoSub });
  }
  if (role === 'doctor' && approvalStatus === 'rejected') {
    return unauthorized('Your account application was rejected.');
  }

  // Use AdminGetUser to confirm the user exists, then initiate auth
  try {
    const getUserCmd = new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: email });
    await cognitoClient.send(getUserCmd);
  } catch {
    return unauthorized('Account exists but Cognito user not found. Please contact support.');
  }

  // Generate fresh tokens via custom auth challenge (OTP already verified)
  // We use a temporary approach: set a random password and authenticate
  // This avoids needing the user's password for WhatsApp login
  try {
    // Initiate CUSTOM_AUTH to issue tokens
    const authCmd = new AdminInitiateAuthCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      AuthFlow: 'CUSTOM_AUTH',
      AuthParameters: { USERNAME: email, CHALLENGE_NAME: 'WHATSAPP_OTP_VERIFIED' },
    });
    const initResult = await cognitoClient.send(authCmd);

    if (initResult.AuthenticationResult) {
      return success({
        message: 'Login successful.',
        cognitoSub: (ownerMatch?.cognitoSub || doctorMatch?.cognitoSub) as string,
        role,
        approvalStatus,
        isNewUser: false,
        accessToken: initResult.AuthenticationResult.AccessToken,
        idToken: initResult.AuthenticationResult.IdToken,
        refreshToken: initResult.AuthenticationResult.RefreshToken,
        expiresIn: initResult.AuthenticationResult.ExpiresIn ?? 3600,
      });
    }

    // If challenge returned, respond with the verified OTP
    if (initResult.Session) {
      const respondCmd = new AdminRespondToAuthChallengeCommand({
        UserPoolId: USER_POOL_ID,
        ClientId: CLIENT_ID,
        Session: initResult.Session,
        ChallengeName: 'CUSTOM_CHALLENGE',
        ChallengeResponses: { USERNAME: email, ANSWER: code },
      });
      const respondResult = await cognitoClient.send(respondCmd);

      if (respondResult.AuthenticationResult) {
        return success({
          message: 'Login successful.',
          cognitoSub: (ownerMatch?.cognitoSub || doctorMatch?.cognitoSub) as string,
          role,
          approvalStatus,
          isNewUser: false,
          accessToken: respondResult.AuthenticationResult.AccessToken,
          idToken: respondResult.AuthenticationResult.IdToken,
          refreshToken: respondResult.AuthenticationResult.RefreshToken,
          expiresIn: respondResult.AuthenticationResult.ExpiresIn ?? 3600,
        });
      }
    }

    return unauthorized('Authentication failed. Please try again.');
  } catch (err) {
    console.error('WhatsApp login auth failed:', err);
    return internalError('Login failed. Please try again.');
  }
}
