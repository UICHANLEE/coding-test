import { repository } from '../../db/client';
import { authConfig } from './auth';
import { createHandlers } from './handlers';
export const api = createHandlers({
  config: authConfig,
  repository,
  secureCookies: () => process.env.NODE_ENV === 'production',
});
