import Controller from './decorators/controller.js';
import { Get, Post } from './decorators/methods.js';
import Inject from './decorators/inject.js';
import Injectable from './decorators/injectable.js';
import Module from './decorators/module.js';
import { Query, Param, Body } from './decorators/params.js';
import Dispatcher from './dispatcher.js';
import CreateUserDto from './dto/create-user.dto.js';
import ValidationPipe from './pipes/validation.pipe.js';

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

@Controller('users')
class UsersController {
  constructor(
    private logger: Logger,
    private userService: UsersService,
  ) {}

  @Get()
  getAll() {
    this.logger.log('[GET] /users');
    return this.userService.users;
  }

  @Get(':id')
  async getById(@Param(':id') id: string, @Query('attr') attr: string) {
    this.logger.log(`[GET] /users/:id ${id}`);
    const user = this.userService.users[+id] || {};
    return attr ? { [attr]: user[attr as keyof typeof user] } : user;
  }

  @Post()
  createUser(@Body(ValidationPipe) newUser: CreateUserDto) {
    this.logger.log(`[POST] /users ${JSON.stringify(newUser)}`);
    this.userService.users.push(newUser);
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

new Dispatcher(AppModule).listen(PORT);
