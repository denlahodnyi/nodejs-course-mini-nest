import type { AppRequest, AppResponse, Guard } from '../types.js';

export default class TestControllerGuard implements Guard {
  canActivate(context: { req: AppRequest; res: AppResponse }): boolean {
    console.log('TestControllerGuard');
    return true;
  }
}
