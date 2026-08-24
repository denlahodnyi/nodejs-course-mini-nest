import Container from './container.js';
import Bind from './decorators/bind.js';
import Inject from './decorators/inject.js';
import Injectable from './decorators/injectable.js';

@Injectable()
class Logger {
  constructor() {
    console.log('Logger init');
  }
  log(message: unknown) {
    console.log('LOG: ', message);
  }
}

const config = { timezone: 'Europe/London', user: 'johnny' };

@Injectable({ scope: 'transient' })
class State {
  public count: number = 0;
  public date: number = Date.now();

  constructor() {
    console.log('App init');
  }

  public increment() {
    this.count += 1;
  }
}

@Bind({ [Symbol.for('config')]: config })
@Injectable()
class UsersController {
  constructor(
    @Inject(Symbol.for('config')) private config: { user: string },
    private logger: Logger,
    private state: State,
  ) {}

  public getUser() {
    this.logger.log(`UserController: current user is ${this.config.user}`);
    this.state.increment();
    this.state.increment();
    this.state.increment();
    this.logger.log(`UserController: state count ${this.state.count}`);
  }
}

class Locales {
  loc = ['en-US'];
}

@Bind({ [Symbol.for('config')]: config, port: 3000, locales: new Locales() })
@Injectable()
class App {
  constructor(
    @Inject('port') private port: number,
    @Inject(Symbol.for('config')) private config: { timezone: string },
    @Inject('locales') private locales: { loc: string[] },
    private users: UsersController,
    private logger: Logger,
    private state: State,
  ) {}

  public start() {
    this.logger.log(`App starting: PORT = ${this.port}`);
    this.logger.log(`Config: ${JSON.stringify(this.config)}`);
    this.logger.log(`Locales: ${this.locales.loc}`);
    this.state.increment();
    this.logger.log(`App: state count ${this.state.count}`);
    this.users.getUser();
  }
}

const container = new Container();
const appService = container.resolve(App);
appService.start();

console.log('service', appService);

const container2 = new Container();
@Injectable()
class B {
  constructor(a: any) {}
}
@Injectable()
class A {
  constructor(b: B) {}
}
Reflect.defineMetadata('design:paramtypes', [A], B);
try {
  container2.resolve(A);
} catch (err) {
  console.error(err);
}
