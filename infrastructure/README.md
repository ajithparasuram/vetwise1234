# VetWise AWS Infrastructure

Production-grade AWS backend for the VetWise veterinary platform.

## Architecture

```
React Frontend
      |
      v
  API Gateway ── Cognito Authorizer (JWT)
      |
      v
  Lambda Services (14 functions)
      |
      +───────────+───────────+
      |           |           |
      v           v           v
  DynamoDB      S3        Secrets Manager
  (13 tables)  (private)  (Razorpay/WhatsApp/AI)
      |
      v
  External: Razorpay, WhatsApp, AI Provider
```

## Prerequisites

1. **AWS CLI** configured with credentials that can create IAM, Cognito, DynamoDB, Lambda, API Gateway, S3, Secrets Manager, and CloudWatch resources.

2. **AWS CDK** installed and bootstrapped:
   ```bash
   npm install -g aws-cdk
   cdk bootstrap aws://ACCOUNT-ID/us-east-1
   ```

3. **Node.js 20+** for Lambda runtime.

## Deployment

### Step 1: Install dependencies

```bash
cd infrastructure
npm install
cd lambda && npm install && cd ..
```

### Step 2: Build the CDK TypeScript

```bash
npm run build
```

### Step 3: Review the diff before deploying

```bash
npm run diff:staging
```

### Step 4: Deploy to staging

```bash
npm run deploy:staging
```

This creates all resources with the `VetWiseStaging` prefix. Staging resources use `RemovalPolicy.DESTROY` so they can be torn down cleanly.

### Step 5: Note the stack outputs

After deployment, CDK prints:
- `UserPoolId` — Cognito User Pool ID
- `UserPoolClientId` — Cognito App Client ID
- `ApiUrl` — API Gateway base URL
- `MediaBucketName` — Private S3 bucket name
- `RazorpaySecretArn`, `WhatsAppSecretArn`, `AISecretArn` — Secrets Manager ARNs
- `Table_*` — All DynamoDB table names

### Step 6: Configure secrets in AWS Secrets Manager

After deployment, update the placeholder secrets with real credentials:

```bash
# Razorpay (TEST MODE for staging)
aws secretsmanager update-secret --secret-id vetwise/razorpay/staging \
  --secret-string '{"RAZORPAY_KEY_ID":"rzp_test_XXX","RAZORPAY_KEY_SECRET":"XXX","RAZORPAY_WEBHOOK_SECRET":"XXX"}'

# WhatsApp
aws secretsmanager update-secret --secret-id vetwise/whatsapp/staging \
  --secret-string '{"WHATSAPP_ACCESS_TOKEN":"XXX","WHATSAPP_PHONE_NUMBER_ID":"XXX"}'

# AI provider (after provider is named and approved)
aws secretsmanager update-secret --secret-id vetwise/ai/staging \
  --secret-string '{"AI_PROVIDER":"openai","AI_MODEL":"gpt-4o","AI_API_KEY":"sk-XXX"}'
```

### Step 7: Seed initial data

Create the default organization and subscription plans:

```bash
# Using AWS CLI or DynamoDB console:
# VetWiseStaging-Organizations:
#   organizationId: "org_default", name: "VetWise Default", status: "active"

# VetWiseStaging-Plans:
#   planId: "plan_monthly", name: "Monthly Membership", price: 499, currency: "INR",
#   billingInterval: "monthly", duration: "1 month", active: true, benefits: [...]
#
#   planId: "plan_annual", name: "Annual Membership", price: 4999, currency: "INR",
#   billingInterval: "yearly", duration: "12 months", active: true, benefits: [...]

# VetWiseStaging-ServiceAreas:
#   areaId: "area_palakkad", name: "Palakkad", type: "city", active: true,
#   coverageGeometry: { centerLat: 10.7867, centerLng: 76.6542, radiusKm: 15 },
#   serviceTypes: ["home_visit", "clinic_visit", "teleconsultation", "vaccination"]
```

### Step 8: Set frontend environment variables

In the frontend `.env`:

```
VITE_API_BASE_URL=https://XXXXXX.execute-api.us-east-1.amazonaws.com/staging
VITE_COGNITO_USER_POOL_ID=<from stack outputs>
VITE_COGNITO_CLIENT_ID=<from stack outputs>
VITE_COGNITO_REGION=us-east-1
```

## Resources Created

### Cognito
| Resource | Name |
|---------|------|
| User Pool | VetWiseStaging-UserPool |
| App Client | VetWiseStaging-AppClient |

**Auth factors**: EMAIL_OTP, SMS_OTP, PASSWORD via USER_AUTH flow.

**IMPORTANT**: Before OTP works, verify in the AWS Cognito console that:
1. The user pool's feature plan supports passwordless OTP (Lite plan may not — if so, upgrade to Essential or higher).
2. Email delivery is configured (Cognito's default email works for low volume; for production, configure Amazon SES).
3. SMS delivery is configured and the SNS SMS sandbox is lifted (register test numbers in sandbox mode first).

### DynamoDB (13 tables + 2 support tables)
| Table | Partition Key | GSIs |
|-------|--------------|------|
| VetWiseStaging-Organizations | organizationId | — |
| VetWiseStaging-Owners | ownerId | — |
| VetWiseStaging-Pets | petId | ownerIdIndex |
| VetWiseStaging-Appointments | appointmentId | ownerIdIndex, doctorIdIndex |
| VetWiseStaging-ClinicalRecords | recordId | petIdIndex |
| VetWiseStaging-Prescriptions | rxId | petIdIndex |
| VetWiseStaging-Payments | paymentId | ownerIdIndex |
| VetWiseStaging-Subscriptions | subscriptionId | ownerIdIndex |
| VetWiseStaging-Doctors | doctorId | cognitoSubIndex, approvalStatusIndex |
| VetWiseStaging-Plans | planId | — |
| VetWiseStaging-Notifications | notificationId | recipientIdIndex |
| VetWiseStaging-AuditLogs | auditId | actorIdIndex |
| VetWiseStaging-ServiceAreas | areaId | — |
| VetWiseStaging-ContactEnquiries | enquiryId | — |

All tables use on-demand billing (PAY_PER_REQUEST).

### S3
| Bucket | Purpose |
|--------|---------|
| vetwise-media-private-staging-ACCOUNT | Pet photos, videos, prescription PDFs |

Block Public Access enabled. Encryption: S3 managed. TLS-only enforced.

### Lambda (14 functions)
| Function | Handler | Purpose |
|----------|--------|---------|
| AuthFunction | src/handlers/auth.handler | Signup, login, OTP, refresh |
| ClientsFunction | src/handlers/clients.handler | Client/owner CRUD |
| PatientsFunction | src/handlers/patients.handler | Pet CRUD |
| AppointmentsFunction | src/handlers/appointments.handler | Appointment CRUD |
| ClinicalRecordsFunction | src/handlers/clinical-records.handler | Clinical records |
| PrescriptionsFunction | src/handlers/prescriptions.handler | Prescriptions + PDF |
| PaymentsFunction | src/handlers/payments.handler | Razorpay orders, verify, webhook |
| SubscriptionsFunction | src/handlers/subscriptions.handler | Subscription CRUD |
| DoctorsFunction | src/handlers/doctors.handler | Doctor approval workflow |
| NotificationsFunction | src/handlers/notifications.handler | Notification listing |
| AiFunction | src/handlers/ai.handler | AI Health Checker |
| ServiceabilityFunction | src/handlers/serviceability.handler | Service area check |
| ContactFunction | src/handlers/contact.handler | Contact form |
| SettingsFunction | src/handlers/settings.handler | App configuration |

### API Gateway
| Base URL | `https://XXXX.execute-api.us-east-1.amazonaws.com/staging` |
|----------|-----|

All endpoints except `/auth/*`, `/serviceability`, `/contact`, and `/payments/webhook` require Cognito JWT authorization.

### Secrets Manager
| Secret | Keys |
|--------|------|
| vetwise/razorpay/staging | RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET |
| vetwise/whatsapp/staging | WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID |
| vetwise/ai/staging | AI_PROVIDER, AI_MODEL, AI_API_KEY |

### CloudWatch Alarms
- Error alarm per Lambda function (threshold: 1 error in 5 min)
- Throttle alarm per Lambda function
- API Gateway 5xx alarm (threshold: 5 in 15 min)

## API Endpoints

### Public (no auth)
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/signup | Register (client/doctor only) |
| POST | /auth/login | Password login |
| POST | /auth/otp | Send OTP |
| PUT | /auth/otp | Verify OTP |
| POST | /auth/forgot-password | Password recovery |
| POST | /auth/refresh | Refresh tokens |
| GET | /serviceability?lat=&lng= | Check service area |
| POST | /contact | Contact form |
| POST | /payments/webhook | Razorpay webhook |

### Protected (Cognito JWT required)
| Method | Path | Roles |
|--------|------|-------|
| GET | /clients | admin, frontdesk, doctor, client(self) |
| POST | /clients | admin, frontdesk |
| PUT | /clients/{id} | admin, frontdesk, client(self) |
| GET | /patients | all |
| POST | /patients | client, admin, frontdesk |
| PUT | /patients/{id} | client(owner), admin, frontdesk |
| GET | /appointments | all (filtered) |
| POST | /appointments | all |
| PUT | /appointments/{id} | all (filtered) |
| GET | /clinical-records | doctor, client(own), admin |
| POST | /clinical-records | doctor (active only) |
| GET | /prescriptions | doctor, client(own finalized), admin |
| POST | /prescriptions | doctor (active only) |
| GET | /prescriptions/{id} | doctor, client(own), admin |
| POST | /prescriptions/{id}/finalize | doctor (prescribing) |
| GET | /prescriptions/{id}/pdf | doctor, client(own), admin |
| POST | /payments/orders | authenticated |
| POST | /payments/verify | authenticated |
| GET | /payments | admin, frontdesk, client(own) |
| GET | /payments/{id} | admin, frontdesk(limited), client(own) |
| GET | /subscriptions | admin, frontdesk, client(own) |
| POST | /subscriptions | client, admin |
| GET | /subscriptions/{id} | client(own), admin |
| POST | /subscriptions/{id}/cancel | client(own), admin |
| GET | /doctors | all (clients see active only) |
| POST | /doctors | admin |
| GET | /doctors/pending | admin |
| POST | /doctors/{id}/approve | admin |
| POST | /doctors/{id}/reject | admin |
| GET | /notifications | all (own) |
| POST | /ai/health-check | authenticated (10/day) or public (30/hr) |
| GET | /settings | authenticated |

## Security Checklist

- [x] Cognito JWT authorization on all protected endpoints
- [x] Server-side role enforcement (never trusts client role)
- [x] Owner/client data isolation
- [x] Doctor assignment checks
- [x] Admin-only privileged actions (doctor approval, staff creation)
- [x] Front-desk restrictions (no clinical records, no prescriptions)
- [x] Field whitelisting (never persists arbitrary body fields)
- [x] Input validation and sanitization
- [x] Rate limiting (AI, contact form)
- [x] Payment webhook idempotency
- [x] Razorpay signature verification (server-side)
- [x] Server-computed payment amounts (client amount ignored)
- [x] Private S3 with presigned URLs only
- [x] Secrets in AWS Secrets Manager (never in source)
- [x] No AWS credentials in frontend
- [x] CORS configured on API Gateway
- [x] CloudWatch alarms for errors and throttling
- [x] Audit logging for AI requests

## Teardown

```bash
# Destroy staging (removes all staging resources)
npm run destroy:staging
```

## STOP Conditions (per spec Section 40)

Before proceeding to production, verify:

1. **Cognito feature plan** supports EMAIL_OTP and SMS_OTP — check in AWS Console
2. **SNS SMS sandbox** — register test numbers and verify SMS delivery before lifting sandbox
3. **Razorpay credentials** — set real TEST MODE credentials in Secrets Manager
4. **Razorpay Subscriptions** — confirm the feature is enabled on the merchant account before building recurring billing
5. **AI provider** — name and get approval for the specific provider/model before setting credentials
6. **WhatsApp** — configure official WhatsApp Business Cloud API credentials
7. **No secrets in Git** — verify `.gitignore` excludes all secret files
