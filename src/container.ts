import 'reflect-metadata';
import { type Scope } from './decorators/injectable.js';
import {
  BINDINGS,
  CONTROLLERS,
  DESIGN_PARAM_TOKEN,
  IS_INJECTABLE,
  IS_MODULE,
  PARAM_TOKENS,
  PREFIX,
  PROVIDERS,
  SCOPE,
} from './tokens.js';
import type { Controller, Ctor, Module } from './types.js';
import { type Bindings } from './decorators/bind.js';
import { type ParamTokens } from './decorators/inject.js';
import type {
  ControllersMetadata,
  ProvidersMetadata,
} from './decorators/module.js';

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

  public resolveModule<T>(module: Ctor<T>): Module<T> {
    // check if it's module
    if (!Reflect.getMetadata(IS_MODULE, module)) {
      throw new Error(`Must be a module: ${module.name}`);
    }
    // init controllers
    const registeredControllers: ControllersMetadata = Reflect.getMetadata(
      CONTROLLERS,
      module,
    );
    const controllers = registeredControllers.length
      ? this.resolveControllers(registeredControllers, module)
      : [];
    const deps: Ctor<unknown>[] =
      Reflect.getMetadata(DESIGN_PARAM_TOKEN, module) ?? [];
    const resolvedDeps = deps.map((dep) => this.resolveProvider(dep, module));
    const moduleInstance = new module(...resolvedDeps) as Module<T>;
    moduleInstance._controllers = controllers;

    return moduleInstance;
  }

  private resolveControllers(
    controllers: ControllersMetadata,
    module: Ctor<unknown>,
  ) {
    return controllers.map((controller) => {
      const deps: Ctor<unknown>[] =
        Reflect.getMetadata(DESIGN_PARAM_TOKEN, controller) ?? [];
      const resolvedDeps = deps.map((dep) => this.resolveProvider(dep, module));
      const controllerInstance = new controller(...resolvedDeps) as Controller;
      controllerInstance.prefix = Reflect.getMetadata(PREFIX, controller);
      return controllerInstance;
    });
  }

  private resolveProvider<T>(
    ctor: Ctor<T>,
    module: Ctor<unknown>,
    resolved?: Set<Ctor<unknown>>,
  ): T {
    // check if injectable
    if (!Reflect.getMetadata(IS_INJECTABLE, ctor)) {
      throw new Error(`${ctor.name} is not injectable`);
    }

    const resolvedSet: Set<Ctor<unknown>> = resolved
      ? new Set(...[resolved])
      : new Set();
    // check circular dep
    if (resolvedSet.has(ctor)) {
      throw new Error(
        `Circular dependencies: ${[...resolvedSet.values().map((c) => c.name), ctor.name].join(' -> ')}`,
      );
    }
    resolvedSet.add(ctor);

    // pull cached instance
    if (this.singletons.has(ctor)) return this.singletons.get(ctor);

    const deps: FunctionConstructor[] =
      Reflect.getMetadata(DESIGN_PARAM_TOKEN, ctor) ?? [];
    const injectedTokens: ParamTokens | undefined = Reflect.getMetadata(
      PARAM_TOKENS,
      ctor,
    );
    const resolvedDeps = deps.map((dep, paramIdx) => {
      if (!builtIns.includes(dep) && !injectedTokens?.has(paramIdx)) {
        // Custom class
        return this.resolveProvider(dep, module, resolvedSet);
      }
      // Find provider
      if (!injectedTokens || !injectedTokens.has(paramIdx)) {
        throw new Error(`No token for dependency at [${paramIdx}]`);
      }
      const injectedToken = injectedTokens.get(paramIdx)!;
      const provider = (
        Reflect.getMetadata(PROVIDERS, module) as ProvidersMetadata
      ).find((providerConf) => providerConf.provide === injectedToken);

      if (!provider) {
        throw new Error(`Unregistered provider: ${dep}`);
      }

      // Resolve provider
      if (provider.useValue) return provider.useValue;
      if (!provider.useClass) {
        throw new Error(
          `Missed useClass for ${provider.provide.toString()} token`,
        );
      }
      return this.resolveProvider(provider.useClass, module, resolvedSet);
    });

    const instance = new ctor(...resolvedDeps);

    const scope: Scope = Reflect.getMetadata(SCOPE, ctor);
    if (scope === 'singleton') {
      this.singletons.set(ctor, instance);
    }

    return instance;
  }

  public resolve_OLD<T>(ctor: Ctor<T>, resolved?: Set<Ctor<unknown>>): T {
    // check if injectable
    if (!Reflect.getMetadata(IS_INJECTABLE, ctor)) {
      throw new Error(`${ctor.name} is not injectable`);
    }

    const resolvedSet: Set<Ctor<unknown>> = resolved
      ? new Set(...[resolved])
      : new Set();
    // check circular dep
    if (resolvedSet.has(ctor)) {
      throw new Error(
        `Circular dependencies: ${[...resolvedSet.values().map((c) => c.name), ctor.name].join(' -> ')}`,
      );
    }
    resolvedSet.add(ctor);

    // pull cached instance
    if (this.singletons.has(ctor)) return this.singletons.get(ctor);

    const scope: Scope = Reflect.getMetadata(SCOPE, ctor);
    const deps: FunctionConstructor[] =
      Reflect.getMetadata(DESIGN_PARAM_TOKEN, ctor) ?? [];
    // resolve child deps
    const resolvedDeps = deps.map((dep, paramIdx) => {
      const paramTokens: ParamTokens | undefined = Reflect.getMetadata(
        PARAM_TOKENS,
        ctor,
      );
      // check it this is a custom class (and no need @Inject by token)
      if (!builtIns.includes(dep) && !paramTokens?.has(paramIdx)) {
        return this.resolve_OLD(dep, resolvedSet);
      }
      // otherwise find dep by @Inject + @Bind
      const tokenBindings: Bindings | undefined = Reflect.getMetadata(
        BINDINGS,
        ctor,
      );

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
      this.singletons.set(ctor, instance);
    }

    return instance;
  }
}
