/**
 * DynamoDB helper utilities.
 * Centralizes table access, UUID generation, and common query patterns.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export function db(): DynamoDBDocumentClient {
  return docClient;
}

export function tableName(key: string): string {
  const name = process.env[`TABLE_${key.toUpperCase()}`];
  if (!name) throw new Error(`Table ${key} not configured`);
  return name;
}

export function uuid(): string {
  return `vw_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function now(): string {
  return new Date().toISOString();
}

export async function putItem<T extends Record<string, unknown>>(tableKey: string, item: T): Promise<T> {
  await db().send(new PutCommand({ TableName: tableName(tableKey), Item: item }));
  return item;
}

export async function getItem<T extends Record<string, unknown>>(
  tableKey: string,
  key: Record<string, unknown>
): Promise<T | null> {
  const result = await db().send(new GetCommand({ TableName: tableName(tableKey), Key: key }));
  return (result.Item as T) ?? null;
}

export async function queryByIndex<T extends Record<string, unknown>>(
  tableKey: string,
  indexName: string,
  keyCondition: string,
  exprValues: Record<string, unknown>
): Promise<T[]> {
  const result = await db().send(new QueryCommand({
    TableName: tableName(tableKey),
    IndexName: indexName,
    KeyConditionExpression: keyCondition,
    ExpressionAttributeValues: exprValues,
  ScanIndexForward: false,
  Limit: 100,
  }));
  return (result.Items as T[]) ?? [];
}

export async function scanTable<T extends Record<string, unknown>>(tableKey: string): Promise<T[]> {
  const result = await db().send(new ScanCommand({ TableName: tableName(tableKey), Limit: 100 }));
  return (result.Items as T[]) ?? [];
}

export async function updateItem(
  tableKey: string,
  key: Record<string, unknown>,
  updates: Record<string, unknown>
): Promise<void> {
  const setClauses: string[] = [];
  const exprNames: Record<string, string> = {};
  const exprValues: Record<string, unknown> = {};

  Object.entries(updates).forEach(([field, value], i) => {
    const placeholder = `:v${i}`;
    const namePlaceholder = `#f${i}`;
    setClauses.push(`${namePlaceholder} = ${placeholder}`);
    exprNames[namePlaceholder] = field;
    exprValues[placeholder] = value;
  });

  if (setClauses.length === 0) return;

  await db().send(new UpdateCommand({
    TableName: tableName(tableKey),
    Key: key,
    UpdateExpression: `SET ${setClauses.join(', ')}`,
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
  }));
}

export async function deleteItem(tableKey: string, key: Record<string, unknown>): Promise<void> {
  await db().send(new DeleteCommand({ TableName: tableName(tableKey), Key: key }));
}
