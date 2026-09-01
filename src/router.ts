import type { ClientRequest, IncomingMessage } from 'node:http';
import type { RoutesMetadata } from './decorators/methods.js';
import { DESIGN_PARAM_TOKEN, ROUTE_PARAMS, ROUTES } from './tokens.js';
import type { Controller, Ctor, RouteParamsMetadata } from './types.js';

export default class Router {
  public static async getHandler(
    method: NonNullable<IncomingMessage['method']>,
    url: NonNullable<IncomingMessage['url']>,
    controllers: Controller[],
    body?: unknown,
  ) {
    const fullUrl = new URL(`http://${process.env.HOST ?? 'localhost'}${url}`);
    const paths = fullUrl.pathname.split('/').filter(Boolean);
    let isPrefixedPath = false;

    if (!paths.length || paths.at(0)?.startsWith(':')) {
      // [''] | [':id'] –> search in unprefixed controllers
      controllers = controllers.filter((c) => c.prefix === '');
    } else {
      // ['users'] | ['users', ':id']
      const prefixed = controllers.filter((c) => c.prefix === paths.at(0));
      if (!prefixed.length)
        controllers = controllers.filter((c) => c.prefix === '');
      else isPrefixedPath = true;
    }

    const finalRouteData: {
      handler?: Function;
      controller?: Controller;
      params: { [key: string]: string }; // { ':id': '12' }
      handlerArgs: any[];
      isRegisteredPath: boolean;
    } = { params: {}, handlerArgs: [], isRegisteredPath: true };

    let i = 0;
    for (const c of controllers) {
      i += 1;
      const routes: RoutesMetadata | undefined = Reflect.getMetadata(ROUTES, c);
      if (!routes) break;

      const pathSegments = isPrefixedPath ? paths.slice(1) : paths;
      let leaf = routes[method.toLowerCase() as keyof RoutesMetadata];

      if (!pathSegments.length && leaf?._root) {
        finalRouteData.handler = leaf?._root?.handler;
        finalRouteData.controller = c;
      }

      pathSegments.forEach((path, i) => {
        const pathConf = leaf?.[path] ?? leaf?._param;
        if (!pathConf) {
          finalRouteData.isRegisteredPath = false;
          return;
        }
        if (!finalRouteData.isRegisteredPath) return;
        finalRouteData.isRegisteredPath = true;
        if (i === pathSegments.length - 1) {
          finalRouteData.handler = pathConf?.handler;
          finalRouteData.controller = c;
          if (pathConf?.isParam) {
            finalRouteData.params[pathConf.param!] = path;
          }
        } else {
          if (pathConf?.isParam) {
            finalRouteData.params[pathConf.param!] = path;
          }
          if (!pathConf?.next) return;
          leaf = pathConf.next;
        }
      });

      if (!finalRouteData.isRegisteredPath) return;

      if (finalRouteData.handler) {
        // Construct arguments for the handler
        const routeParams: RouteParamsMetadata = Reflect.getMetadata(
          ROUTE_PARAMS,
          c,
        );
        const handlerName = finalRouteData.handler.name;
        const handlerParamsMeta: Ctor<unknown>[] =
          Reflect.getMetadata(
            DESIGN_PARAM_TOKEN,
            Object.getPrototypeOf(finalRouteData.controller),
            handlerName,
          ) ?? [];
        finalRouteData.handlerArgs = [];

        for (const [
          paramIdx,
          handlerParamMeta,
        ] of handlerParamsMeta.entries()) {
          const handlerArgConf = routeParams?.[handlerName]?.[paramIdx];
          if (handlerArgConf?.type === 'param') {
            finalRouteData.handlerArgs.push(
              handlerArgConf.param
                ? finalRouteData.params[
                    handlerArgConf.param.startsWith(':')
                      ? handlerArgConf.param
                      : ':' + handlerArgConf.param
                  ]
                : finalRouteData.params,
            );
          } else if (handlerArgConf?.type === 'query') {
            const query = handlerArgConf.query
              ? fullUrl.searchParams.get(handlerArgConf.query)
              : Object.fromEntries(fullUrl.searchParams.entries());
            finalRouteData.handlerArgs.push(query);
          } else if (handlerArgConf?.type === 'body') {
            let validatedBody = body;
            if (handlerArgConf.pipe) {
              const pipe =
                typeof handlerArgConf.pipe === 'function'
                  ? new handlerArgConf.pipe()
                  : handlerArgConf.pipe;
              try {
                validatedBody = await pipe.transform(
                  validatedBody,
                  handlerParamMeta,
                );
              } catch (err) {
                throw err;
              }
            }
            finalRouteData.handlerArgs.push(validatedBody);
          } else {
            // should throw ???
            finalRouteData.handlerArgs.push(undefined);
          }
        }

        break;
      }
    }

    if (!finalRouteData.handler) {
      return;
    }
    return {
      handler: finalRouteData.handler.bind(finalRouteData.controller),
      args: finalRouteData.handlerArgs,
    };
  }
}
