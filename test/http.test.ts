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
import type z from 'zod';

let port: number;
const getServerUrl = () => `localhost:${port}`;

const users = [
  { name: 'Den', country: 'Ukraine', email: 'den@example.com', age: 20 },
  { name: 'John', country: 'US', email: 'john@example.com', age: 32 },
];

@Controller('users')
class UsersController {
  users: CreateUserDto[] = users;

  @Get()
  getAll() {
    return this.users;
  }

  @Get('test-query')
  getLimit(@Query('limit') limit: string) {
    return limit;
  }

  @Get(':id')
  async getById(@Param(':id') id: string, @Query('attr') attr: string) {
    const user = this.users[+id] || {};
    return attr ? { [attr]: user[attr as keyof typeof user] } : user;
  }

  @Post()
  createUser(@Body(ValidationPipe) newUser: CreateUserDto) {
    // this.users.push(newUser);
    return newUser;
  }

  @Post('zod')
  createUser2(
    @Body(new ZodValidationPipe(createUserSchema))
    newUser: z.infer<typeof createUserSchema>,
  ) {
    // this.users.push(newUser);
    return newUser;
  }

  createUserPostCalls = 0;

  @UseGuards(AuthGuard)
  @Post('/post')
  createUserPost() {
    this.createUserPostCalls += 1;
  }

  @Get('/boom')
  boom() {
    throw new Error('BOOM');
  }

  @Get('/heavy')
  async heavy() {
    const randomValue = Math.floor(Math.random() * 3);
    await setTimeout([500, 200, 900][randomValue]);
  }
}

@Module({
  controllers: [UsersController],
})
class AppModule {}

let app: Dispatcher<AppModule>;

beforeEach(async () => {
  app = new Dispatcher(AppModule);
  app.use(ReqContext);
  app.useGlobalFilters(ExceptionFilter);
  await app.listen(0);
  port = app.getPort();
});

afterEach(async () => {
  await app.close();
  vi.restoreAllMocks();
});

test('GET /boom returns 500 and error message', async () => {
  try {
    await request.get(`${getServerUrl()}/users/boom`);
    expect.fail('Should have thrown a 500 error');
  } catch (err: any) {
    expect(err.status).toBe(500);
    expect(err.response.text).toBe('Internal server error');
  }
});

test('GET /none returns 404 and error message', async () => {
  try {
    await request.get(`${getServerUrl()}/none`);
    expect.fail('Should have thrown a 400 error');
  } catch (err: any) {
    expect(err.status).toBe(404);
    expect(err.response.text).toBe('Resource not found');
  }
});

test('GET /users/1 returns 200 and user', async () => {
  const response = await request.get(`${getServerUrl()}/users/1`);
  expect(response.statusCode).toBe(200);
  expect(response.body).toStrictEqual(users[1]);
});

test('GET /users/1 returns X-Request-Id: 777', async () => {
  const reqId = '777';
  const response = await request
    .get(`${getServerUrl()}/users/1`)
    .set({ 'X-Request-Id': reqId });
  expect(response.header['x-request-id']).toBe(reqId);
});

test('GET /users/heavy returns correct X-Request-Id for parallel requests', async () => {
  const reqIds = Array.from({ length: 10 }, (_, i) => String(i + 1));
  const responses = await Promise.all([
    request
      .get(`${getServerUrl()}/users/heavy`)
      .set({ 'X-Request-Id': reqIds[0] }),
    request
      .get(`${getServerUrl()}/users/heavy`)
      .set({ 'X-Request-Id': reqIds[1] }),
    request
      .get(`${getServerUrl()}/users/heavy`)
      .set({ 'X-Request-Id': reqIds[2] }),
    request
      .get(`${getServerUrl()}/users/heavy`)
      .set({ 'X-Request-Id': reqIds[3] }),
    request
      .get(`${getServerUrl()}/users/heavy`)
      .set({ 'X-Request-Id': reqIds[4] }),
    request
      .get(`${getServerUrl()}/users/heavy`)
      .set({ 'X-Request-Id': reqIds[5] }),
    request
      .get(`${getServerUrl()}/users/heavy`)
      .set({ 'X-Request-Id': reqIds[6] }),
    request
      .get(`${getServerUrl()}/users/heavy`)
      .set({ 'X-Request-Id': reqIds[7] }),
    request
      .get(`${getServerUrl()}/users/heavy`)
      .set({ 'X-Request-Id': reqIds[8] }),
    request
      .get(`${getServerUrl()}/users/heavy`)
      .set({ 'X-Request-Id': reqIds[9] }),
  ]);
  expect(responses[0].header['x-request-id']).toBe(reqIds[0]);
  expect(responses[1].header['x-request-id']).toBe(reqIds[1]);
  expect(responses[2].header['x-request-id']).toBe(reqIds[2]);
  expect(responses[3].header['x-request-id']).toBe(reqIds[3]);
  expect(responses[4].header['x-request-id']).toBe(reqIds[4]);
  expect(responses[5].header['x-request-id']).toBe(reqIds[5]);
  expect(responses[6].header['x-request-id']).toBe(reqIds[6]);
  expect(responses[7].header['x-request-id']).toBe(reqIds[7]);
  expect(responses[8].header['x-request-id']).toBe(reqIds[8]);
  expect(responses[9].header['x-request-id']).toBe(reqIds[9]);
});

test('GET /users?limit=10 returns 200 and user', async () => {
  const LIMIT = '10';
  const response = await request.get(
    `${getServerUrl()}/users/test-query?limit=${LIMIT}`,
  );
  expect(response.statusCode).toBe(200);
  expect(response.body).toBe(LIMIT);
});

test('POST /users returns 201 and user', async () => {
  const NEW_USER: CreateUserDto = {
    name: 'Lisa',
    age: 20,
    country: 'US',
    email: 'lis@example.com',
  };
  const response = await request
    .post(`${getServerUrl()}/users`)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(NEW_USER));
  expect(response.statusCode).toBe(201);
  expect(response.body).toStrictEqual(NEW_USER);
});

test('POST /users returns 201 and user', async () => {
  const NEW_USER: CreateUserDto = {
    name: 'Lisa',
    age: 20,
    country: 'US',
    email: 'lis@example.com',
  };
  const response = await request
    .post(`${getServerUrl()}/users`)
    .set('Content-Type', 'application/json')
    .send(JSON.stringify(NEW_USER));
  expect(response.statusCode).toBe(201);
  expect(response.body).toStrictEqual(NEW_USER);
});

test('POST /users returns 400 and validation errors for invalid user', async () => {
  const NEW_USER = {
    name: 'Lisa',
    country: 'US',
  };
  try {
    await request
      .post(`${getServerUrl()}/users`)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(NEW_USER));
    expect.fail('Should have thrown a 400 error');
  } catch (err: any) {
    expect(err.status).toBe(400);
    expect(err.response.body).toStrictEqual({
      message: 'Validation error',
      errors: expect.arrayContaining([
        {
          field: 'email',
          constraints: expect.any(Array),
        },
        {
          field: 'age',
          constraints: expect.any(Array),
        },
      ]),
    });
  }
});

test('POST /zod returns 400 and validation errors for invalid user', async () => {
  const NEW_USER = {
    name: 'Lisa',
    country: 'US',
  };
  try {
    await request
      .post(`${getServerUrl()}/users`)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(NEW_USER));
    expect.fail('Should have thrown a 400 error');
  } catch (err: any) {
    expect(err.status).toBe(400);
    expect(err.response.body).toStrictEqual({
      message: 'Validation error',
      errors: expect.arrayContaining([
        {
          field: 'email',
          constraints: expect.any(Array),
        },
        {
          field: 'age',
          constraints: expect.any(Array),
        },
      ]),
    });
  }
});

test('POST /users/post returns 403 if no Authorization header was provided', async () => {
  try {
    await request
      .post(`${getServerUrl()}/users/post`)
      .set('Content-Type', 'application/json')
      .send({});
    expect.fail('Should have thrown a 403 error');
  } catch (err: any) {
    expect(err.status).toBe(403);
    expect(
      (app.root?._controllers[0] as UsersController).createUserPostCalls,
    ).toBe(0);
  }
});

test('POST /users/post returns 201 if Authorization header was provided', async () => {
  const response = await request
    .post(`${getServerUrl()}/users/post`)
    .set('Content-Type', 'application/json')
    .set('Authorization', 'Bearer foobarbaz')
    .send({});
  expect(response.status).toBe(201);
  expect(
    (app.root?._controllers[0] as UsersController).createUserPostCalls,
  ).toBe(1);
});
