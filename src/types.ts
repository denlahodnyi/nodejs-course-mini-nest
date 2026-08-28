import type { IncomingMessage, ServerResponse } from 'node:http';

export interface Ctor<T> {
  new (...args: any): T;
}

export type Module<T> = {
  _controllers: Controller[];
} & T;

export interface Controller {
  prefix?: string;
}

export interface Pipe {
  transform: <T>(value: T, meta: any) => Promise<T>;
}

export type AppRequest = IncomingMessage;
export type AppResponse = ServerResponse;

export type MiddlewareFunc = (
  req: AppRequest,
  res: AppResponse,
  next: () => void,
) => void | Promise<void>;

export type Filter = {
  catch(exception: Error, context: { req: AppRequest; res: AppResponse }): void;
};

export type Guard = {
  canActivate(context: { req: AppRequest; res: AppResponse }): boolean;
};

export type Interceptor = {
  intercept(
    context: { req: AppRequest; res: AppResponse },
    next: { handle: () => Promise<unknown> },
  ): Promise<unknown>;
};

export type RouteParamsMetadata = {
  [handlerName: string | symbol]:
    | undefined
    | {
        [idx: number]:
          | undefined
          | { type: 'param'; param?: string }
          | { type: 'query'; query?: string }
          | { type: 'body'; pipe?: Pipe | Ctor<Pipe> };
      };
};
