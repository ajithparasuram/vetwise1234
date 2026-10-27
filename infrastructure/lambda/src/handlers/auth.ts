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
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { success, badRequest, unauthorized, internalError, conflict, parseBody } from '../shared/response';
import { putItem, getItem, uuid, now, tableName } from '../shared/db';
import { validateEmail, validatePhone, sanitizeString } from '../shared/validation';
import type { Role, Owner, Doctor } from '../shared/types';

const cognitoClient = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;

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
