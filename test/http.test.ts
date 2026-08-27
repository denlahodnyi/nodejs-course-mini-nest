import 'reflect-metadata';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import request from 'superagent';
import Dispatcher from '../src/dispatcher.js';
import Module from '../src/decorators/module.js';
import Controller from '../src/decorators/controller.js';
import { Param, Query, Body } from '../src/decorators/params.js';
import { Get, Post } from '../src/decorators/methods.js';
import CreateUserDto from '../src/dto/create-user.dto.js';
import ValidationPipe from '../src/pipes/validation.pipe.js';

const PORT = 8080;
const SERVER_URL = `localhost:${8080}`;

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
}

@Module({
  controllers: [UsersController],
})
class AppModule {}

let app: Dispatcher<AppModule>;

beforeEach(async () => {
  app = new Dispatcher(AppModule);
  await app.listen(PORT);
});

afterEach(async () => {
  await app.close();
  vi.restoreAllMocks();
});

test('GET /none returns 404 and error message', async () => {
  try {
    await request.get(`${SERVER_URL}/none`);
    expect.fail('Should have thrown a 400 error');
  } catch (err: any) {
    expect(err.status).toBe(404);
    expect(err.response.text).toBe("Resource doesn't exist");
  }
});

test('GET /users/1 returns 200 and user', async () => {
  const response = await request.get(`${SERVER_URL}/users/1`);
  expect(response.statusCode).toBe(200);
  expect(response.body).toStrictEqual(users[1]);
});

test('GET /users?limit=10 returns 200 and user', async () => {
  const LIMIT = '10';
  const response = await request.get(
    `${SERVER_URL}/users/test-query?limit=${LIMIT}`,
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
    .post(`${SERVER_URL}/users`)
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
      .post(`${SERVER_URL}/users`)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(NEW_USER));
    expect.fail('Should have thrown a 400 error');
  } catch (err: any) {
    expect(err.status).toBe(400);
    expect(err.response.body).toStrictEqual({
      error: 'Validation error',
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
