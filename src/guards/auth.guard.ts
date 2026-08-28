import { LogStorage } from '../context/lifecycle-log.js';
import type { AppRequest, AppResponse, Guard } from '../types.js';

export default class AuthGuard implements Guard {
  canActivate(context: { req: AppRequest; res: AppResponse }): boolean {
    console.log('AuthGuard');
    LogStorage.write('guard');
    const authHeader = context.req.headers['authorization'];
    const token =
      authHeader?.startsWith('Bearer ') && authHeader?.split(' ')[1];
    return !!token;
  }
}
