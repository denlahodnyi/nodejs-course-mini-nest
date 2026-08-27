import { CONTROLLERS, IS_MODULE, PROVIDERS } from '../tokens.js';
import type { Ctor } from '../types.js';

type ProviderConfig = {
  provide: string | symbol | Ctor<unknown>;
} & (
  | { useClass: Ctor<unknown>; useValue?: never }
  | { useValue?: Object; useClass?: never }
);

type ModuleConfig = {
  providers?: (ProviderConfig | Ctor<unknown>)[];
  controllers?: Ctor<unknown>[];
};

export type ControllersMetadata = Ctor<unknown>[];
export type ProvidersMetadata = ProviderConfig[];

export default function Module(config?: ModuleConfig): ClassDecorator {
  return (target) => {
    const providers =
      config?.providers?.map((pr) =>
        typeof pr === 'object' ? pr : { provide: pr, useClass: pr },
      ) ?? [];
    Reflect.defineMetadata(IS_MODULE, true, target);
    Reflect.defineMetadata(PROVIDERS, providers, target);
    Reflect.defineMetadata(CONTROLLERS, config?.controllers ?? [], target);
  };
}
