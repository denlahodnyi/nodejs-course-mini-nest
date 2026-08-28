import { CONTROLLER_GUARDS, IS_CONTROLLER, ROUTE_GUARDS } from '../tokens.js';
import type { Ctor, Guard } from '../types.js';

export type ControllerGuardMetadata = Ctor<Guard>[];
export type RouteGuardMetadata = {
  [propName: string]: Ctor<Guard>[];
};

export default function UseGuards(guard: Ctor<Guard>) {
  return (target: any, propKey?: string | symbol, descriptor?: any) => {
    const isController = Reflect.getMetadata(IS_CONTROLLER, target);
    if (isController) {
      Reflect.defineMetadata(CONTROLLER_GUARDS, [guard], target);
    } else if (propKey) {
      const routeGuardsMap: RouteGuardMetadata = Reflect.getMetadata(
        ROUTE_GUARDS,
        target,
      );
      Reflect.defineMetadata(
        ROUTE_GUARDS,
        { ...routeGuardsMap, [propKey]: [guard] },
        target,
      );
    }
  };
}
