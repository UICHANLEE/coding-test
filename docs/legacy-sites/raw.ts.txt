import { env } from 'cloudflare:workers';
export function database() {
  if (!env.DB) throw new Error('Study storage unavailable');
  return env.DB;
}
