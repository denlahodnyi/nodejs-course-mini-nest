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
