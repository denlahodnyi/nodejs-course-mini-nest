import 'reflect-metadata';
import { type Scope } from './decorators/injectable.js';
import { BINDINGS, IS_INJECTABLE, PARAM_TOKENS, SCOPE } from './tokens.js';
import type { Ctor } from './types.js';
import { type Bindings } from './decorators/bind.js';
import { type ParamTokens } from './decorators/inject.js';

const builtIns = [
  String,
  Number,
  Boolean,
  Object,
  Array,
  Date,
  Function,
  RegExp,
  Error,
];

export default class Container {
  private singletons = new Map();

  public resolve<T>(ctor: Ctor<T>, resolved?: string[]): T {
    // check if injectable
    if (!Reflect.getMetadata(IS_INJECTABLE, ctor)) {
      throw new Error(`${ctor.name} is not injectable`);
    }

    const resolvedSet = resolved ? [...resolved] : [];
    // check circular dep
    if (resolvedSet.includes(ctor.name)) {
      throw new Error(
        `Circular dependencies: ${[...resolvedSet, ctor.name].join(' -> ')}`,
      );
    }
    resolvedSet.push(ctor.name);

    // pull cached instance
    if (this.singletons.has(ctor)) return this.singletons.get(ctor);

    const scope: Scope = Reflect.getMetadata(SCOPE, ctor);
    const deps: FunctionConstructor[] = Reflect.getMetadata('design:paramtypes', ctor) ?? [];
    // resolve child deps
    const resolvedDeps = deps.map((dep, paramIdx) => {
      // check it this is a custom class
      if (!builtIns.includes(dep)) return this.resolve(dep, resolvedSet);
      // otherwise find dep by @Inject + @Bind
      const paramTokens: ParamTokens = Reflect.getMetadata(
        PARAM_TOKENS,
        ctor,
      );
      const tokenBindings: Bindings = Reflect.getMetadata(BINDINGS, ctor);
      if (tokenBindings && paramTokens && paramTokens.has(paramIdx)) {
        const token = paramTokens.get(paramIdx)!;
        return tokenBindings.get(token);
      }
    });

    const instance = new ctor(...resolvedDeps);

    if (scope === 'singleton') {
      this.singletons.set(ctor, instance)
    }

    return instance;
  }
}
