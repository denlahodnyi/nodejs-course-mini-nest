import { IS_INJECTABLE, SCOPE } from '../tokens.js';

export type Scope = 'singleton' | 'transient';

export default function Injectable(options?: { scope: Scope }): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(IS_INJECTABLE, true, target);
    Reflect.defineMetadata(SCOPE, options?.scope ?? 'singleton', target);
  };
}
