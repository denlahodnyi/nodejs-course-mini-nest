import 'reflect-metadata';
import { setTimeout } from 'node:timers/promises';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import request, { ResponseError } from 'superagent';
import Dispatcher from '../src/dispatcher.js';
import Module from '../src/decorators/module.js';
import Controller from '../src/decorators/controller.js';
import { Param, Query, Body } from '../src/decorators/params.js';
import { Get, Post } from '../src/decorators/methods.js';
import CreateUserDto, { createUserSchema } from '../src/dto/create-user.dto.js';
import ValidationPipe from '../src/pipes/validation.pipe.js';
import ZodValidationPipe from '../src/pipes/zod-validation.pipe.js';
import UseGuards from '../src/decorators/use-guards.js';
import AuthGuard from '../src/guards/auth.guard.js';
import ExceptionFilter from '../src/filters/exception.filter.js';
import ReqContext from '../src/context/request-context.js';
import LoggingInterceptor from '../src/interceptors/logging.interceptor.js';
import logsContextMiddleware, {
  LogStorage,
} from '../src/context/lifecycle-log.js';
import type z from 'zod';

const PORT = 8081;
const SERVER_URL = `localhost:${PORT}`;

@Controller()
class TestController {
  @UseGuards(AuthGuard)
  @Post('go')
  createUser(
    @Body(new ZodValidationPipe(createUserSchema))
    newUser: z.infer<typeof createUserSchema>,
  ) {
    LogStorage.write('handler');
  }
}

@Module({
  controllers: [TestController],
})
class AppModule {}

let app: Dispatcher<AppModule>;

beforeEach(async () => {
  LogStorage.reset();
  app = new Dispatcher(AppModule);
  app.use(logsContextMiddleware);
  app.useGlobalFilters(ExceptionFilter);
  app.useGlobalInterceptors(LoggingInterceptor);
  await app.listen(PORT);
});

afterEach(async () => {
  await app.close();
  vi.restoreAllMocks();
});

test('Success path', async () => {
  await request
    .post(`${SERVER_URL}/go`)
    .set('Content-Type', 'application/json')
    .set('Authorization', 'Bearer foobar')
    .send({
      name: 'Lisa',
      age: 20,
      country: 'US',
      email: 'lis@example.com',
    });
  expect([...LogStorage.getLogs()]).toStrictEqual([
    'middleware',
    'guard',
    'interceptor:before',
    'pipe',
    'handler',
    'interceptor:after',
  ]);
});

test('Failed path', async () => {
  try {
    await request
      .post(`${SERVER_URL}/go`)
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer foobar')
      .send({
        name: 'Lisa',
        // age: 20,
        country: 'US',
        email: 'lis@example.com',
      });
  } catch (err: any) {
    expect([...LogStorage.getLogs()]).toStrictEqual([
      'middleware',
      'guard',
      'interceptor:before',
      'pipe',
      'filter',
      // 'handler',
      // 'interceptor:after',
    ]);
  }
});
