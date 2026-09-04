import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// disable prefetch as it is not supported for "transaction" pool mode
export const client = postgres(connectionString, { 
  prepare: false,
  ssl: process.env.NODE_ENV === 'production' || (connectionString && !connectionString.includes('localhost')) ? 'require' : false
});
export const db = drizzle(client, { schema });
