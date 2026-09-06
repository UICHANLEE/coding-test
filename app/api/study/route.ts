import { api } from '@/lib/server/api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => api.getStudy(request);
export const POST = (request: Request) => api.saveStudy(request);
