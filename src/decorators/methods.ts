import { ROUTES } from '../tokens.js';

type RoutePathname = {
  isParam: boolean;
  param?: string;
  handler?: Function;
  next?: RoutePathnames;
};
export type RoutePathnames = {
  [key: '_root' | '_param' | string]: RoutePathname;
};
export type RoutesMetadata = {
  [Key in 'get' | 'post']?: RoutePathnames;
};

export function Get(path?: string): MethodDecorator {
  return (target, propKey, descriptor) => {
    methodDecoratorFactory('get', target, propKey, descriptor, path);
  };
}

export function Post(path?: string): MethodDecorator {
  return (target, propKey, descriptor) => {
    methodDecoratorFactory('post', target, propKey, descriptor, path);
  };
}

function methodDecoratorFactory(
  method: 'get' | 'post',
  target: Object,
  propKey: string | symbol,
  descriptor: any,
  path?: string,
) {
  let routes: RoutesMetadata | undefined = Reflect.getMetadata(ROUTES, target);
  const pathnameSegments = path?.split('/').filter(Boolean) || [];
  if (!descriptor.value)
    throw new Error(`Undefined method for ${target}.${propKey.toString()}`);
  if (!routes?.[method]) routes = { ...routes, [method]: {} };
  if (!pathnameSegments.length) {
    routes[method]!['_root'] = {
      isParam: false,
      handler: descriptor.value as unknown as Function,
    };
  } else {
    let leaf = routes[method]!;
    pathnameSegments.forEach((seg, i) => {
      let isParam = false;
      if (seg.startsWith(':')) {
        isParam = /^:.*?/.test(seg);
        if (!isParam)
          throw new Error(`Invalid param ${seg} at ${propKey.toString()}`);
      }
      const segConf: RoutePathname = {
        isParam,
        param: isParam ? seg : undefined,
      };
      const pathKey = isParam ? '_param' : seg;
      if (i === pathnameSegments.length - 1) {
        segConf.handler = descriptor.value as unknown as Function;
        leaf[pathKey] = segConf;
      } else {
        segConf.next = {};
        leaf[pathKey] = segConf;
        leaf = segConf.next;
      }
    });
  }

  Reflect.defineMetadata(ROUTES, routes, target);
}
