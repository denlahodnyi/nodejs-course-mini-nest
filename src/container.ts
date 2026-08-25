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

  public resolve<T>(ctor: Ctor<T>, resolved?: Set<Ctor<unknown>>): T {
    // check if injectable
    if (!Reflect.getMetadata(IS_INJECTABLE, ctor)) {
      throw new Error(`${ctor.name} is not injectable`);
    }

    const resolvedSet: Set<Ctor<unknown>> = resolved ? new Set(...[resolved]) : new Set();
    // check circular dep
    if (resolvedSet.has(ctor)) {
      throw new Error(
        `Circular dependencies: ${[...resolvedSet.values().map(c => c.name), ctor.name].join(' -> ')}`,
      );
    }
    resolvedSet.add(ctor);

    // pull cached instance
    if (this.singletons.has(ctor)) return this.singletons.get(ctor);

    const scope: Scope = Reflect.getMetadata(SCOPE, ctor);
    const deps: FunctionConstructor[] = Reflect.getMetadata('design:paramtypes', ctor) ?? [];
    // resolve child deps
    const resolvedDeps = deps.map((dep, paramIdx) => {
      const paramTokens: ParamTokens | undefined = Reflect.getMetadata(
        PARAM_TOKENS,
        ctor,
      );
      // check it this is a custom class (and no need @Inject by token)
      if (!builtIns.includes(dep) && !paramTokens?.has(paramIdx)) {
        return this.resolve(dep, resolvedSet);
      }
      // otherwise find dep by @Inject + @Bind
      const tokenBindings: Bindings | undefined = Reflect.getMetadata(BINDINGS, ctor);

      if (!paramTokens) {
        throw new Error(
          `Cannot resolve: no tokens at [${paramIdx}] for ${ctor}`,
        );
      }
      if (!tokenBindings) {
        throw new Error(
          `Cannot resolve: no registered dependency at [${paramIdx}] for ${ctor}`,
        );
      }
      const token = paramTokens.get(paramIdx)!;

      if (!token) {
        throw new Error(
          `Cannot resolve: no token at [${paramIdx}] index for ${ctor}`,
        );
      }

      const explicitDep = tokenBindings.get(token);

      if (!explicitDep) {
        throw new Error(
        `Cannot resolve: no bind dependency for "${String(token)}" at [${paramIdx}] index in ${ctor}`,
        );
      }

      return explicitDep;
    });

    const instance = new ctor(...resolvedDeps);

    if (scope === 'singleton') {
      this.singletons.set(ctor, instance)
    }

    return instance;
  }
}
