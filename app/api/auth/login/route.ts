import { api } from '@/lib/server/api';
export const runtime = 'nodejs';
export const POST = (request: Request) => api.login(request);
