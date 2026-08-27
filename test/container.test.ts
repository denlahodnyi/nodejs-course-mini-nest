import 'reflect-metadata';
import { expect, test } from 'vitest';
import Container from '../src/container.js';
import Injectable from '../src/decorators/injectable.js';
import Inject from '../src/decorators/inject.js';
import Module from '../src/decorators/module.js';

test('Container resolves dependencies A -> B -> C', async () => {
  @Injectable()
  class C {}
  @Injectable()
  class B {
    constructor(public c: C) {}
  }
  @Module({ providers: [C, B] })
  class A {
    constructor(public b: B) {}
  }
  const container = new Container();
  const serviceA = container.resolveModule(A);
  expect(serviceA.b).toBeInstanceOf(B);
  expect(serviceA.b.c).toBeInstanceOf(C);
});

test('Container allows only class with @Module', async () => {
  class A {}
  const container = new Container();
  expect(() => container.resolveModule(A)).toThrow(/must be a module/i);
});

test('Singleton scope returns the same instance', async () => {
  @Injectable()
  class C {}
  @Injectable()
  class B {
    constructor(public c: C) {}
  }
  @Module({ providers: [C, B] })
  class A {
    constructor(
      public b: B,
      public c: C,
    ) {}
  }
  const container = new Container();
  const serviceA = container.resolveModule(A);
  expect(serviceA).toStrictEqual(container.resolveModule(A));
  expect(serviceA.c).toStrictEqual(serviceA.b.c);
});

test('Transient scope returns different instances', async () => {
  @Injectable({ scope: 'transient' })
  class C {}
  @Injectable()
  class B {
    constructor(public c: C) {}
  }
  @Injectable({ scope: 'transient' })
  class A {
    constructor(
      public b: B,
      public c: C,
    ) {}
  }
  @Module({ providers: [A, B, C] })
  class Root {
    constructor(public a: A) {}
  }
  const container = new Container();
  const root = container.resolveModule(Root);
  expect(root.a).not.toBe(container.resolveModule(Root).a);
  expect(root.a.c).not.toBe(root.a.b.c);
});

test('Should throw on circular dependencies', async () => {
  @Injectable()
  class B {
    constructor(public a: any) {}
  }
  @Injectable()
  class A {
    constructor(public b: B) {}
  }
  @Module({ providers: [A, B] })
  class Root {
    constructor(public a: A) {}
  }
  Reflect.defineMetadata('design:paramtypes', [A], B);
  const container = new Container();
  expect(() => container.resolveModule(Root)).toThrow(
    /circular dependencies: a -> b -> a/i,
  );
});

test('@Inject injects dependencies by the token', async () => {
  @Injectable()
  class A {
    constructor(
      @Inject(Symbol.for('port')) public port: number,
      @Inject('config') public conf: { dev: boolean },
    ) {}
  }
  @Module({
    providers: [
      A,
      { provide: Symbol.for('port'), useValue: 3000 },
      { provide: 'config', useValue: { dev: true } },
    ],
  })
  class Root {
    constructor(public a: A) {}
  }
  const container = new Container();
  const service = container.resolveModule(Root);
  expect(service.a.port).toBe(3000);
  expect(service.a.conf).toStrictEqual({ dev: true });
});

test('Throws if there is no token for the erased type', async () => {
  @Injectable()
  class A {
    constructor(public conf: { dev: boolean }) {}
  }
  @Module()
  class Root {
    constructor(public a: A) {}
  }
  const container = new Container();
  expect(() => container.resolveModule(Root)).toThrow(
    /no token for dependency at \[0\]/i,
  );
});
