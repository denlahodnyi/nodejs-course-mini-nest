import { ROUTE_PARAMS } from '../tokens.js';
import type { Ctor, Pipe, RouteParamsMetadata } from '../types.js';

export function Query(query?: string): ParameterDecorator {
  return (target, propKey, paramIdx) => {
    const routeParams: RouteParamsMetadata =
      Reflect.getMetadata(ROUTE_PARAMS, target) || {};
    if (!propKey) throw new Error('Cannot find method for the @Query');
    if (!routeParams[propKey]) routeParams[propKey] = {};
    routeParams[propKey][paramIdx] = { type: 'query', query };
    Reflect.defineMetadata(ROUTE_PARAMS, routeParams, target);
  };
}

export function Param(param?: string): ParameterDecorator {
  return (target, propKey, paramIdx) => {
    const routeParams: RouteParamsMetadata =
      Reflect.getMetadata(ROUTE_PARAMS, target) || {};
    if (!propKey) throw new Error('Cannot find method for the @Param');
    if (!routeParams[propKey]) routeParams[propKey] = {};
    routeParams[propKey][paramIdx] = { type: 'param', param };
    Reflect.defineMetadata(ROUTE_PARAMS, routeParams, target);
  };
}

export function Body(pipe?: Pipe | Ctor<Pipe>): ParameterDecorator {
  return (target, propKey, paramIdx) => {
    const routeParams: RouteParamsMetadata =
      Reflect.getMetadata(ROUTE_PARAMS, target) || {};
    if (!propKey) throw new Error('Cannot find method for the @Body');
    if (!routeParams[propKey]) routeParams[propKey] = {};
    routeParams[propKey][paramIdx] = { type: 'body', pipe };
    Reflect.defineMetadata(ROUTE_PARAMS, routeParams, target);
  };
}
