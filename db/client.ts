import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { createRepository } from './repository';
let client: NeonQueryFunction<false, false> | undefined;
export function repository() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not configured');
    client = neon(url);
  }
  const sql = client;
  return createRepository(async (text, values = []) => sql.query(text, values));
}
