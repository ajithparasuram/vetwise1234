#!/usr/bin/env node
/**
 * VetWise CDK App Entry Point
 *
 * Deploys the VetWise backend stack to AWS.
 *
 * Usage:
 *   cdk deploy VetWiseStack --stage staging
 *   cdk deploy VetWiseStack --stage production
 *
 * Prerequisites:
 *   - AWS CLI configured with credentials that can create:
 *     Cognito, DynamoDB, Lambda, API Gateway, S3, Secrets Manager, IAM
 *   - CDK bootstrapped in the target account/region:
 *     cdk bootstrap aws://ACCOUNT-ID/us-east-1
 *
 * Environment variables (optional overrides):
 *   CDK_DEFAULT_ACCOUNT  — AWS account ID
 *   CDK_DEFAULT_REGION   — AWS region (defaults to us-east-1)
 */

import { App, Environment } from 'aws-cdk-lib';
import { VetWiseStack } from '../lib/vetwise-stack';

const stage = (process.env.CDK_STAGE ?? 'staging') as 'staging' | 'production';
const account = process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID ?? '';
const region = process.env.CDK_DEFAULT_REGION ?? 'us-east-1';

const env: Environment = { account, region };

const app = new App();

new VetWiseStack(app, 'VetWiseStack', {
  stage,
  env,
  description: `VetWise veterinary platform backend — ${stage} environment. SJ Vetfolio Pvt. Ltd.`,
});

app.synth();
