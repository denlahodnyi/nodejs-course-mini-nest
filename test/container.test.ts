import 'reflect-metadata';
import { expect, test } from 'vitest';
import Container from '../src/container.js';
import Injectable from '../src/decorators/injectable.js';
import Bind from '../src/decorators/bind.js';
import Inject from '../src/decorators/inject.js';

test('Container resolves dependencies A -> B -> C', async () => {
  @Injectable()
  class C {}
  @Injectable()
  class B {
    constructor(public c: C) {}
  }
  @Injectable()
  class A {
    constructor(public b: B) {}
  }
  const container = new Container();
  const serviceA = container.resolve(A);
  expect(serviceA.b).toBeInstanceOf(B);
  expect(serviceA.b.c).toBeInstanceOf(C);
});

test('Singleton scope returns the same instance', async () => {
  @Injectable()
  class C {}
  @Injectable()
  class B {
    constructor(public c: C) {}
  }
  @Injectable()
  class A {
    constructor(public b: B, public c: C) {}
  }
  const container = new Container();
  const serviceA = container.resolve(A);
  expect(serviceA).toBe(container.resolve(A));
  expect(serviceA.c).toBe(serviceA.b.c);
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
  const container = new Container();
  const serviceA = container.resolve(A);
  expect(serviceA).not.toBe(container.resolve(A));
  expect(serviceA.c).not.toBe(serviceA.b.c);
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
  Reflect.defineMetadata('design:paramtypes', [A], B);
  const container = new Container();
  expect(() => container.resolve(A)).toThrow(/circular dependencies: a -> b -> a/i);
});

test('@Inject injects dependencies by the token', async () => {
  @Bind({ [Symbol.for('port')]: 3000, config: { dev: true } })
  @Injectable()
  class A {
    constructor(
      @Inject(Symbol.for('port')) public port: number,
      @Inject('config') public conf: { dev: boolean; },
    ) {}
  }
  const container = new Container();
  const service = container.resolve(A);
  expect(service.port).toBe(3000);
  expect(service.conf).toStrictEqual({ dev: true });
});

test('Throws if there is no token for the erased type', async () => {
  @Bind({ config: { dev: true } })
  @Injectable()
  class A {
    constructor(
      public conf: { dev: boolean; },
    ) {}
  }
  const container = new Container();
  expect(() => container.resolve(A)).toThrow(
    /cannot resolve/i,
  );
});

test('Throws if there is no registered dependency for the erased type', async () => {
  @Injectable()
  class A {
    constructor(
      public conf: { dev: boolean; },
    ) {}
  }
  const container = new Container();
  expect(() => container.resolve(A)).toThrow(
    /cannot resolve/i,
  );
});
