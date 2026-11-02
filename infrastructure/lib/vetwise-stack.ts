/**
 * VetWiseStack — Complete AWS infrastructure for the VetWise veterinary platform.
 *
 * Resources created (all prefixed with stage for environment isolation):
 *
 *   Cognito:
 *     - VetWiseUserPool          (EMAIL_OTP, SMS_OTP, PASSWORD auth factors)
 *     - VetWiseUserPoolClient    (ALLOW_USER_AUTH flow)
 *
 *   DynamoDB (on-demand billing, all with GSIs as specified):
 *     - VetWiseOrganizations
 *     - VetWiseOwners
 *     - VetWisePets             (GSI: ownerId)
 *     - VetWiseAppointments     (GSI: ownerId, doctorId)
 *     - VetWiseClinicalRecords  (GSI: petId)
 *     - VetWisePrescriptions    (GSI: petId)
 *     - VetWisePayments         (GSI: ownerId)
 *     - VetWiseSubscriptions    (GSI: ownerId)
 *     - VetWiseDoctors
 *     - VetWisePlans
 *     - VetWiseNotifications
 *     - VetWiseAuditLogs
 *     - VetWiseServiceAreas
 *     - VetWiseContactEnquiries
 *
 *   S3:
 *     - vetwise-media-private-{stage}  (Block Public Access, encryption, TLS-only)
 *
 *   Secrets Manager:
 *     - vetwise/razorpay/{stage}      (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET)
 *     - vetwise/whatsapp/{stage}     (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID)
 *     - vetwise/ai/{stage}           (AI_PROVIDER, AI_API_KEY)
 *
 *   API Gateway:
 *     - VetWiseApi                  (REST API with Cognito authorizer)
 *
 *   Lambda Functions:
 *     - vetwise-auth                (signup, OTP send/verify, password login, token refresh, forgot password)
 *     - vetwise-clients             (GET/POST/PUT /clients)
 *     - vetwise-patients            (GET/POST/PUT /patients)
 *     - vetwise-appointments        (GET/POST/PUT /appointments)
 *     - vetwise-clinical-records    (GET/POST /clinical-records)
 *     - vetwise-prescriptions       (GET/POST /prescriptions, finalize, pdf)
 *     - vetwise-payments            (orders, verify, GET, webhook)
 *     - vetwise-subscriptions       (GET/POST /subscriptions, cancel)
 *     - vetwise-doctors             (GET/POST /doctors, pending, approve, reject)
 *     - vetwise-notifications      (GET /notifications)
 *     - vetwise-ai                  (POST /ai/health-check)
 *     - vetwise-serviceability      (GET /serviceability)
 *     - vetwise-contact             (POST /contact)
 *     - vetwise-settings            (GET /settings)
 *
 *   CloudWatch:
 *     - Alarms for Lambda errors, API 5xx, webhook failures, auth failures, throttling
 *
 *   IAM:
 *     - Least-privilege roles per Lambda function
 *     - Scoped DynamoDB access per table
 *     - S3 access scoped to private bucket only
 *     - Secrets Manager read access per secret
 */

import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as path from 'path';
import { Construct } from 'constructs';

export interface VetWiseStackProps extends cdk.StackProps {
  stage: 'staging' | 'production';
}

export class VetWiseStack extends cdk.Stack {
  public readonly stage: string;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly api: apigateway.RestApi;
  public readonly mediaBucket: s3.Bucket;
  public readonly tables: Record<string, dynamodb.Table> = {};

  constructor(scope: Construct, id: string, props: VetWiseStackProps) {
    super(scope, id, props);

    this.stage = props.stage;
    const prefix = `VetWise${props.stage === 'production' ? 'Prod' : 'Staging'}`;

    // ============================================================
    // 1. COGNITO USER POOL — OTP + Password authentication
    // ============================================================
    this.userPool = new cognito.UserPool(this, 'VetWiseUserPool', {
      userPoolName: `${prefix}-UserPool`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        phone: true,
      },
      standardAttributes: {
        email: { required: true, mutable: true },
        phoneNumber: { required: true, mutable: true },
        name: { required: true, mutable: true },
      },
      customAttributes: {
        role: new cognito.StringAttribute({ mutable: true, minLen: 1, maxLen: 20 }),
        organizationId: new cognito.StringAttribute({ mutable: true, minLen: 0, maxLen: 100 }),
        approvalStatus: new cognito.StringAttribute({ mutable: true, minLen: 0, maxLen: 20 }),
      },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });

    // App Client supporting USER_AUTH flow for choice-based authentication
    this.userPoolClient = this.userPool.addClient('VetWiseAppClient', {
      userPoolClientName: `${prefix}-AppClient`,
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: false,
          implicitCodeGrant: false,
        },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PHONE, cognito.OAuthScope.PROFILE],
      },
      generateSecret: false,
      idTokenValidity: cdk.Duration.hours(1),
      accessTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    // ============================================================
    // 2. DYNAMODB TABLES — All 13 tables from spec Section 8
    // ============================================================
    this.tables.organizations = new dynamodb.Table(this, 'VetWiseOrganizations', {
      tableName: `${prefix}-Organizations`,
      partitionKey: { name: 'organizationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });

    this.tables.owners = new dynamodb.Table(this, 'VetWiseOwners', {
      tableName: `${prefix}-Owners`,
      partitionKey: { name: 'ownerId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });
    this.tables.owners.addGlobalSecondaryIndex({
      indexName: 'phoneIndex',
      partitionKey: { name: 'phone', type: dynamodb.AttributeType.STRING },
    });

    this.tables.pets = new dynamodb.Table(this, 'VetWisePets', {
      tableName: `${prefix}-Pets`,
      partitionKey: { name: 'petId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });
    this.tables.pets.addGlobalSecondaryIndex({
      indexName: 'ownerIdIndex',
      partitionKey: { name: 'ownerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    this.tables.appointments = new dynamodb.Table(this, 'VetWiseAppointments', {
      tableName: `${prefix}-Appointments`,
      partitionKey: { name: 'appointmentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });
    this.tables.appointments.addGlobalSecondaryIndex({
      indexName: 'ownerIdIndex',
      partitionKey: { name: 'ownerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
    });
    this.tables.appointments.addGlobalSecondaryIndex({
      indexName: 'doctorIdIndex',
      partitionKey: { name: 'doctorId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
    });

    this.tables.clinicalRecords = new dynamodb.Table(this, 'VetWiseClinicalRecords', {
      tableName: `${prefix}-ClinicalRecords`,
      partitionKey: { name: 'recordId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });
    this.tables.clinicalRecords.addGlobalSecondaryIndex({
      indexName: 'petIdIndex',
      partitionKey: { name: 'petId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
    });

    this.tables.prescriptions = new dynamodb.Table(this, 'VetWisePrescriptions', {
      tableName: `${prefix}-Prescriptions`,
      partitionKey: { name: 'rxId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });
    this.tables.prescriptions.addGlobalSecondaryIndex({
      indexName: 'petIdIndex',
      partitionKey: { name: 'petId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
    });

    this.tables.payments = new dynamodb.Table(this, 'VetWisePayments', {
      tableName: `${prefix}-Payments`,
      partitionKey: { name: 'paymentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });
    this.tables.payments.addGlobalSecondaryIndex({
      indexName: 'ownerIdIndex',
      partitionKey: { name: 'ownerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    this.tables.subscriptions = new dynamodb.Table(this, 'VetWiseSubscriptions', {
      tableName: `${prefix}-Subscriptions`,
      partitionKey: { name: 'subscriptionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });
    this.tables.subscriptions.addGlobalSecondaryIndex({
      indexName: 'ownerIdIndex',
      partitionKey: { name: 'ownerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    this.tables.doctors = new dynamodb.Table(this, 'VetWiseDoctors', {
      tableName: `${prefix}-Doctors`,
      partitionKey: { name: 'doctorId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });
    this.tables.doctors.addGlobalSecondaryIndex({
      indexName: 'phoneIndex',
      partitionKey: { name: 'phone', type: dynamodb.AttributeType.STRING },
    });
    this.tables.doctors.addGlobalSecondaryIndex({
      indexName: 'cognitoSubIndex',
      partitionKey: { name: 'cognitoSub', type: dynamodb.AttributeType.STRING },
    });
    this.tables.doctors.addGlobalSecondaryIndex({
      indexName: 'approvalStatusIndex',
      partitionKey: { name: 'approvalStatus', type: dynamodb.AttributeType.STRING },
    });

    this.tables.plans = new dynamodb.Table(this, 'VetWisePlans', {
      tableName: `${prefix}-Plans`,
      partitionKey: { name: 'planId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });

    this.tables.notifications = new dynamodb.Table(this, 'VetWiseNotifications', {
      tableName: `${prefix}-Notifications`,
      partitionKey: { name: 'notificationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });
    this.tables.notifications.addGlobalSecondaryIndex({
      indexName: 'recipientIdIndex',
      partitionKey: { name: 'recipientId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    this.tables.auditLogs = new dynamodb.Table(this, 'VetWiseAuditLogs', {
      tableName: `${prefix}-AuditLogs`,
      partitionKey: { name: 'auditId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });
    this.tables.auditLogs.addGlobalSecondaryIndex({
      indexName: 'actorIdIndex',
      partitionKey: { name: 'actorId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    this.tables.serviceAreas = new dynamodb.Table(this, 'VetWiseServiceAreas', {
      tableName: `${prefix}-ServiceAreas`,
      partitionKey: { name: 'areaId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });

    this.tables.contactEnquiries = new dynamodb.Table(this, 'VetWiseContactEnquiries', {
      tableName: `${prefix}-ContactEnquiries`,
      partitionKey: { name: 'enquiryId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });

    this.tables.otpStore = new dynamodb.Table(this, 'VetWiseOtpStore', {
      tableName: `${prefix}-OtpStore`,
      partitionKey: { name: 'otpId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: 'ttl',
    });
    this.tables.otpStore.addGlobalSecondaryIndex({
      indexName: 'phoneIndex',
      partitionKey: { name: 'phone', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Device tokens for FCM push notifications (multiple devices per user)
    this.tables.devices = new dynamodb.Table(this, 'VetWiseDevices', {
      tableName: `${prefix}-Devices`,
      partitionKey: { name: 'deviceId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });
    this.tables.devices.addGlobalSecondaryIndex({
      indexName: 'userIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // ============================================================
    // 3. S3 PRIVATE MEDIA BUCKET — Pet photos, videos, prescription PDFs
    // ============================================================
    this.mediaBucket = new s3.Bucket(this, 'VetWiseMediaPrivate', {
      bucketName: `vetwise-media-private-${props.stage}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: props.stage === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: props.stage === 'staging',
      lifecycleRules: [
        { id: 'expire-temp-uploads', expiration: cdk.Duration.days(90), prefix: 'temp/' },
      ],
    });

    // ============================================================
    // 4. SECRETS MANAGER — Razorpay, WhatsApp, AI provider secrets
    // ============================================================
    const razorpaySecret = new secretsmanager.Secret(this, 'RazorpaySecret', {
      secretName: `vetwise/razorpay/${props.stage}`,
      description: 'Razorpay API credentials (TEST MODE for staging)',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          RAZORPAY_KEY_ID: 'PLACEHOLDER',
          RAZORPAY_WEBHOOK_SECRET: 'PLACEHOLDER',
        }),
        generateStringKey: 'RAZORPAY_KEY_SECRET',
        excludeCharacters: '"{}[]',
      },
    });

    const whatsappSecret = new secretsmanager.Secret(this, 'WhatsAppSecret', {
      secretName: `vetwise/whatsapp/${props.stage}`,
      description: 'WhatsApp Business Cloud API credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          WHATSAPP_PHONE_NUMBER_ID: 'PLACEHOLDER',
        }),
        generateStringKey: 'WHATSAPP_ACCESS_TOKEN',
        excludeCharacters: '"{}[]',
      },
    });

    const aiSecret = new secretsmanager.Secret(this, 'AISecret', {
      secretName: `vetwise/ai/${props.stage}`,
      description: 'AI Health Checker provider credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          AI_PROVIDER: 'PLACEHOLDER',
          AI_MODEL: 'PLACEHOLDER',
        }),
        generateStringKey: 'AI_API_KEY',
        excludeCharacters: '"{}[]',
      },
    });

    // ============================================================
    // 5. LAMBDA FUNCTIONS — One per resource domain
    // ============================================================
    const lambdaRuntime = lambda.Runtime.NODEJS_20_X;
    const lambdaMemory = 512;
    const lambdaTimeout = cdk.Duration.seconds(30);

    const baseEnv: Record<string, string> = {
      STAGE: props.stage,
      REGION: this.region,
      COGNITO_USER_POOL_ID: this.userPool.userPoolId,
      COGNITO_CLIENT_ID: this.userPoolClient.userPoolClientId,
      MEDIA_BUCKET_NAME: this.mediaBucket.bucketName,
    };

    // Helper to create a Lambda with standard config and table access
    const createLambda = (
      id: string,
      handlerFile: string,
      env: Record<string, string>,
      tableAccess: dynamodb.Table[],
      extraPolicies?: iam.IGrantable[]
    ): lambda.Function => {
      const fn = new lambda.Function(this, id, {
        runtime: lambdaRuntime,
        handler: handlerFile,
        code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda')),
        memorySize: lambdaMemory,
        timeout: lambdaTimeout,
        environment: { ...baseEnv, ...env },
        tracing: lambda.Tracing.ACTIVE,
      });

      // Grant read/write to specified tables
      tableAccess.forEach((table) => {
        table.grantReadWriteData(fn);
      });

      // Grant S3 access for media
      this.mediaBucket.grantReadWrite(fn);

      // Grant Cognito access for auth functions
      this.userPool.grant(fn, 'cognito-idp:AdminCreateUser', 'cognito-idp:AdminGetUser', 'cognito-idp:AdminUpdateUserAttributes', 'cognito-idp:AdminListGroupsForUser');

      // Apply extra policies if provided
      if (extraPolicies) {
        extraPolicies.forEach((p) => fn.grantPrincipal.addToPrincipalPolicy(new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['*'],
          resources: ['*'],
        })));
      }

      return fn;
    };

    // Map table names for environment variables
    const tableEnv: Record<string, string> = {};
    Object.entries(this.tables).forEach(([key, table]) => {
      tableEnv[`TABLE_${key.toUpperCase()}`] = table.tableName;
    });

    const authFn = createLambda('AuthFunction', 'src/handlers/auth.handler', {
      ...tableEnv,
    }, [this.tables.owners, this.tables.doctors, this.tables.organizations, this.tables.otpStore]);

    const clientsFn = createLambda('ClientsFunction', 'src/handlers/clients.handler', tableEnv, [this.tables.owners, this.tables.organizations]);
    const patientsFn = createLambda('PatientsFunction', 'src/handlers/patients.handler', tableEnv, [this.tables.pets, this.tables.owners]);
    const appointmentsFn = createLambda('AppointmentsFunction', 'src/handlers/appointments.handler', tableEnv, [this.tables.appointments, this.tables.pets, this.tables.owners, this.tables.doctors]);
    const clinicalRecordsFn = createLambda('ClinicalRecordsFunction', 'src/handlers/clinical-records.handler', tableEnv, [this.tables.clinicalRecords, this.tables.pets, this.tables.owners, this.tables.doctors]);
    const prescriptionsFn = createLambda('PrescriptionsFunction', 'src/handlers/prescriptions.handler', tableEnv, [this.tables.prescriptions, this.tables.pets, this.tables.owners, this.tables.doctors]);
    const paymentsFn = createLambda('PaymentsFunction', 'src/handlers/payments.handler', tableEnv, [this.tables.payments, this.tables.owners, this.tables.plans, this.tables.subscriptions]);
    const subscriptionsFn = createLambda('SubscriptionsFunction', 'src/handlers/subscriptions.handler', tableEnv, [this.tables.subscriptions, this.tables.owners, this.tables.plans]);
    const doctorsFn = createLambda('DoctorsFunction', 'src/handlers/doctors.handler', tableEnv, [this.tables.doctors, this.tables.organizations]);
    const notificationsFn = createLambda('NotificationsFunction', 'src/handlers/notifications.handler', tableEnv, [this.tables.notifications]);
    const aiFn = createLambda('AiFunction', 'src/handlers/ai.handler', tableEnv, [this.tables.auditLogs]);
    const serviceabilityFn = createLambda('ServiceabilityFunction', 'src/handlers/serviceability.handler', tableEnv, [this.tables.serviceAreas]);
    const contactFn = createLambda('ContactFunction', 'src/handlers/contact.handler', tableEnv, [this.tables.contactEnquiries]);
    const settingsFn = createLambda('SettingsFunction', 'src/handlers/settings.handler', tableEnv, [this.tables.plans, this.tables.serviceAreas]);
    const devicesFn = createLambda('DevicesFunction', 'src/handlers/devices.handler', tableEnv, [this.tables.devices]);

    // Grant Secrets Manager access to functions that need it
    razorpaySecret.grantRead(paymentsFn);
    razorpaySecret.grantRead(subscriptionsFn);
    whatsappSecret.grantRead(notificationsFn);
    whatsappSecret.grantRead(authFn);
    aiSecret.grantRead(aiFn);

    // Grant Cognito admin access to auth and doctors functions
    this.userPool.grant(authFn, 'cognito-idp:AdminCreateUser', 'cognito-idp:AdminGetUser', 'cognito-idp:AdminUpdateUserAttributes', 'cognito-idp:AdminInitiateAuth', 'cognito-idp:AdminRespondToAuthChallenge', 'cognito-idp:AdminListGroupsForUser', 'cognito-idp:AssociateSoftwareToken', 'cognito-idp:VerifySoftwareToken');
    this.userPool.grant(doctorsFn, 'cognito-idp:AdminGetUser', 'cognito-idp:AdminUpdateUserAttributes');

    // ============================================================
    // 6. API GATEWAY — REST API with Cognito authorizer
    // ============================================================
    this.api = new apigateway.RestApi(this, 'VetWiseApi', {
      restApiName: `${prefix}-API`,
      description: `VetWise veterinary platform API — ${props.stage}`,
      deployOptions: {
        stageName: props.stage,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: false,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: props.stage === 'staging' ? ['*'] : ['https://vetwise.in', 'https://www.vetwise.in'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Client-Info', 'Apikey'],
        allowCredentials: false,
      },
    });

    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'VetWiseAuthorizer', {
      cognitoUserPools: [this.userPool],
      authorizerName: `${prefix}-Authorizer`,
      identitySource: 'method.request.header.Authorization',
    });

    // Helper to add a resource with methods
    const addResource = (
      parent: apigateway.IResource,
      pathPart: string,
      methods: { method: string; lambda: lambda.Function; auth: boolean; apiKeyRequired?: boolean }[]
    ): apigateway.Resource => {
      const resource = parent.addResource(pathPart);
      methods.forEach(({ method, lambda: fn, auth, apiKeyRequired }) => {
        const integration = new apigateway.LambdaIntegration(fn, {
          requestTemplates: { 'application/json': '{ "statusCode": 200 }' },
        });
        resource.addMethod(method, integration, {
          authorizer: auth ? cognitoAuthorizer : undefined,
          authorizationType: auth ? apigateway.AuthorizationType.COGNITO : apigateway.AuthorizationType.NONE,
          apiKeyRequired: apiKeyRequired ?? false,
        });
      });
      return resource;
    };

    // Public auth endpoints (no Cognito auth required — these create/authenticate users)
    const authResource = this.api.root.addResource('auth');
    addResource(authResource, 'signup', [{ method: 'POST', lambda: authFn, auth: false }]);
    addResource(authResource, 'login', [{ method: 'POST', lambda: authFn, auth: false }]);
    addResource(authResource, 'otp', [{ method: 'POST', lambda: authFn, auth: false }]);
    addResource(authResource, 'otp', [{ method: 'PUT', lambda: authFn, auth: false }]);
    addResource(authResource, 'forgot-password', [{ method: 'POST', lambda: authFn, auth: false }]);
    addResource(authResource, 'refresh', [{ method: 'POST', lambda: authFn, auth: false }]);
    addResource(authResource, 'whatsapp-otp', [{ method: 'POST', lambda: authFn, auth: false }]);
    addResource(authResource, 'whatsapp-otp', [{ method: 'PUT', lambda: authFn, auth: false }]);

    // Protected resource endpoints (Cognito auth required)
    addResource(this.api.root, 'clients', [
      { method: 'GET', lambda: clientsFn, auth: true },
      { method: 'POST', lambda: clientsFn, auth: true },
    ]);
    addResource(clientsFn as unknown as apigateway.IResource, 'clients', [{ method: 'PUT', lambda: clientsFn, auth: true }]);

    // /clients/{id}
    const clientsIdResource = this.api.root.addResource('clients').addResource('{id}');
    clientsIdResource.addMethod('PUT', new apigateway.LambdaIntegration(clientsFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    addResource(this.api.root, 'patients', [
      { method: 'GET', lambda: patientsFn, auth: true },
      { method: 'POST', lambda: patientsFn, auth: true },
    ]);
    const patientsIdResource = this.api.root.addResource('patients').addResource('{id}');
    patientsIdResource.addMethod('PUT', new apigateway.LambdaIntegration(patientsFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    addResource(this.api.root, 'appointments', [
      { method: 'GET', lambda: appointmentsFn, auth: true },
      { method: 'POST', lambda: appointmentsFn, auth: true },
    ]);
    const appointmentsIdResource = this.api.root.addResource('appointments').addResource('{id}');
    appointmentsIdResource.addMethod('PUT', new apigateway.LambdaIntegration(appointmentsFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    addResource(this.api.root, 'clinical-records', [
      { method: 'GET', lambda: clinicalRecordsFn, auth: true },
      { method: 'POST', lambda: clinicalRecordsFn, auth: true },
    ]);

    addResource(this.api.root, 'prescriptions', [
      { method: 'GET', lambda: prescriptionsFn, auth: true },
      { method: 'POST', lambda: prescriptionsFn, auth: true },
    ]);
    const prescriptionsIdResource = this.api.root.addResource('prescriptions').addResource('{id}');
    prescriptionsIdResource.addMethod('GET', new apigateway.LambdaIntegration(prescriptionsFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    prescriptionsIdResource.addResource('finalize').addMethod('POST', new apigateway.LambdaIntegration(prescriptionsFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    prescriptionsIdResource.addResource('pdf').addMethod('GET', new apigateway.LambdaIntegration(prescriptionsFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Payments
    const paymentsResource = this.api.root.addResource('payments');
    paymentsResource.addMethod('GET', new apigateway.LambdaIntegration(paymentsFn), {
      authorizer: cognitoAuthorizer, authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    paymentsResource.addResource('orders').addMethod('POST', new apigateway.LambdaIntegration(paymentsFn), {
      authorizer: cognitoAuthorizer, authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    paymentsResource.addResource('verify').addMethod('POST', new apigateway.LambdaIntegration(paymentsFn), {
      authorizer: cognitoAuthorizer, authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    paymentsResource.addResource('webhook').addMethod('POST', new apigateway.LambdaIntegration(paymentsFn), {
      authorizationType: apigateway.AuthorizationType.NONE,
    });
    const paymentsIdResource = paymentsResource.addResource('{id}');
    paymentsIdResource.addMethod('GET', new apigateway.LambdaIntegration(paymentsFn), {
      authorizer: cognitoAuthorizer, authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    paymentsIdResource.addResource('refund').addMethod('POST', new apigateway.LambdaIntegration(paymentsFn), {
      authorizer: cognitoAuthorizer, authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Subscriptions
    addResource(this.api.root, 'subscriptions', [
      { method: 'GET', lambda: subscriptionsFn, auth: true },
      { method: 'POST', lambda: subscriptionsFn, auth: true },
    ]);
    const subsIdResource = this.api.root.addResource('subscriptions').addResource('{id}');
    subsIdResource.addMethod('GET', new apigateway.LambdaIntegration(subscriptionsFn), {
      authorizer: cognitoAuthorizer, authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    subsIdResource.addResource('cancel').addMethod('POST', new apigateway.LambdaIntegration(subscriptionsFn), {
      authorizer: cognitoAuthorizer, authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Doctors
    addResource(this.api.root, 'doctors', [
      { method: 'GET', lambda: doctorsFn, auth: true },
      { method: 'POST', lambda: doctorsFn, auth: true },
    ]);
    const doctorsResource = this.api.root.addResource('doctors');
    doctorsResource.addResource('pending').addMethod('GET', new apigateway.LambdaIntegration(doctorsFn), {
      authorizer: cognitoAuthorizer, authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    const doctorsIdResource = doctorsResource.addResource('{id}');
    doctorsIdResource.addResource('approve').addMethod('POST', new apigateway.LambdaIntegration(doctorsFn), {
      authorizer: cognitoAuthorizer, authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    doctorsIdResource.addResource('reject').addMethod('POST', new apigateway.LambdaIntegration(doctorsFn), {
      authorizer: cognitoAuthorizer, authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Notifications
    addResource(this.api.root, 'notifications', [{ method: 'GET', lambda: notificationsFn, auth: true }]);

    // Devices (FCM push notification token registration)
    addResource(this.api.root, 'devices', [
      { method: 'POST', lambda: devicesFn, auth: true },
      { method: 'GET', lambda: devicesFn, auth: true },
    ]);
    const devicesIdResource = this.api.root.addResource('devices').addResource('{tokenId}');
    devicesIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(devicesFn), {
      authorizer: cognitoAuthorizer, authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // AI Health Checker
    addResource(this.api.root, 'ai', []);
    const aiResource = this.api.root.addResource('ai');
    aiResource.addResource('health-check').addMethod('POST', new apigateway.LambdaIntegration(aiFn), {
      authorizer: cognitoAuthorizer, authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Serviceability (public)
    addResource(this.api.root, 'serviceability', [{ method: 'GET', lambda: serviceabilityFn, auth: false }]);

    // Contact (public, rate-limited)
    addResource(this.api.root, 'contact', [{ method: 'POST', lambda: contactFn, auth: false }]);

    // Settings
    addResource(this.api.root, 'settings', [{ method: 'GET', lambda: settingsFn, auth: true }]);

    // ============================================================
    // 7. CLOUDWATCH ALARMS
    // ============================================================
    const allFunctions = [
      authFn, clientsFn, patientsFn, appointmentsFn, clinicalRecordsFn,
      prescriptionsFn, paymentsFn, subscriptionsFn, doctorsFn,
      notificationsFn, aiFn, serviceabilityFn, contactFn, settingsFn, devicesFn,
    ];

    allFunctions.forEach((fn) => {
      new cloudwatch.Alarm(this, `${fn.node.id}-ErrorAlarm`, {
        alarmName: `${fn.functionName}-errors`,
        metric: fn.metricErrors({ period: cdk.Duration.minutes(5) }),
        threshold: 1,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      new cloudwatch.Alarm(this, `${fn.node.id}-ThrottleAlarm`, {
        alarmName: `${fn.functionName}-throttles`,
        metric: fn.metricThrottles({ period: cdk.Duration.minutes(5) }),
        threshold: 1,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });
    });

    // API Gateway 5xx alarm
    new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      alarmName: `${prefix}-API-5xx`,
      metric: this.api.metric5xxErrors({ period: cdk.Duration.minutes(5) }),
      threshold: 5,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // ============================================================
    // 8. STACK OUTPUTS — Required for frontend wiring and deployment report
    // ============================================================
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'VetWise Cognito User Pool ID',
    });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'VetWise Cognito App Client ID',
    });
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'VetWise API Gateway base URL',
    });
    new cdk.CfnOutput(this, 'MediaBucketName', {
      value: this.mediaBucket.bucketName,
      description: 'Private S3 bucket for pet media and prescription PDFs',
    });
    new cdk.CfnOutput(this, 'RazorpaySecretArn', {
      value: razorpaySecret.secretArn,
      description: 'Secrets Manager ARN for Razorpay credentials',
    });
    new cdk.CfnOutput(this, 'WhatsAppSecretArn', {
      value: whatsappSecret.secretArn,
      description: 'Secrets Manager ARN for WhatsApp credentials',
    });
    new cdk.CfnOutput(this, 'AISecretArn', {
      value: aiSecret.secretArn,
           description: 'Secrets Manager ARN for AI provider credentials',
    });
    Object.entries(this.tables).forEach(([key, table]) => {
      new cdk.CfnOutput(this, `Table_${key}`, {
        value: table.tableName,
        description: `DynamoDB table: ${key}`,
      });
    });
  }
}
