import Controller from './decorators/controller.js';
import { Get, Post } from './decorators/methods.js';
import Inject from './decorators/inject.js';
import Injectable from './decorators/injectable.js';
import Module from './decorators/module.js';
import { Query, Param, Body } from './decorators/params.js';
import Dispatcher from './dispatcher.js';
import CreateUserDto, { createUserSchema } from './dto/create-user.dto.js';
import ValidationPipe from './pipes/validation.pipe.js';
import helloMiddleware from './context/hello.middleware.js';
import requestContextMiddleware, {
  ContextStorage,
} from './context/request-context.js';
import ExceptionFilter from './filters/exception.filter.js';
import UseGuards from './decorators/use-guards.js';
import AuthGuard from './guards/auth.guard.js';
import TestControllerGuard from './guards/test-controller.guard.js';
import LoggingInterceptor from './interceptors/logging.interceptor.js';
import TransformInterceptor from './interceptors/transform.interceptor.js';
import CreateSecData from './dto/create-sec-data.dto.js';
import ZodValidationPipe from './pipes/zod-validation.pipe.js';
import type z from 'zod';

const PORT = 8080;

@Injectable()
class Logger {
  constructor() {
    console.log('Logger init');
  }
  public log(message: unknown) {
    console.log('LOG: ', message);
  }
}

const config = { timezone: 'Europe/London', user: 'johnny' };

@Injectable()
class UsersService {
  constructor(
    @Inject(Symbol.for('config')) private config: { user: string },
    private logger: Logger,
  ) {}

  users: CreateUserDto[] = [
    { name: 'Den', country: 'Ukraine', email: 'den@example.com', age: 20 },
    { name: 'John', country: 'US', email: 'john@example.com', age: 32 },
  ];
}

@UseGuards(TestControllerGuard)
@Controller('users')
class UsersController {
  constructor(
    private logger: Logger,
    private userService: UsersService,
  ) {}

  @Get()
  getAll() {
    this.logger.log(
      `[GET] /users | X-Request-Id = ${ContextStorage.getRequestId()}`,
    );
    return this.userService.users;
  }

  @Get(':id')
  async getById(@Param(':id') id: string, @Query('attr') attr: string) {
    this.logger.log(`[GET] /users/:id ${id}`);
    const user = this.userService.users[+id] || {};
    return attr ? { [attr]: user[attr as keyof typeof user] } : user;
  }

  @Post()
  createUser(
    @Body(new ZodValidationPipe(createUserSchema))
    newUser: z.infer<typeof createUserSchema>,
  ) {
    this.logger.log(`[POST] /users ${JSON.stringify(newUser)}`);
    this.userService.users.push(newUser);
    return newUser;
  }

  @UseGuards(AuthGuard)
  @Get('credentials')
  credentials() {
    this.logger.log(`[GET] /users/credentials`);
    return { hasAccess: true };
  }

  @UseGuards(AuthGuard)
  @Post('secure-data')
  saveSecureData(@Body(ValidationPipe) secData: CreateSecData) {
    this.logger.log(`[POST] /users/secure-data`);
    return { secData };
  }
}

@Controller()
class RootController {
  constructor(private logger: Logger) {}

  @Get('health')
  healthCheck() {
    this.logger.log('[GET] /health');
    return { ok: true };
  }
}

@Module({
  providers: [
    Logger,
    UsersService,
    { provide: Symbol.for('config'), useValue: config },
  ],
  controllers: [UsersController, RootController],
})
class AppModule {
  constructor(private logger: Logger) {
    console.log('App initiated');
  }
}

const app = new Dispatcher(AppModule);
app.use(helloMiddleware, requestContextMiddleware);
app.useGlobalFilters(ExceptionFilter);
app.useGlobalInterceptors(LoggingInterceptor, TransformInterceptor);
app.listen(PORT);
