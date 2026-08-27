import { createServer, Server, type ServerResponse } from 'node:http';
import { promisify } from 'node:util';
import type { Ctor, Module } from './types.js';
import Container from './container.js';
import Router from './router.js';
import { ValidationError } from './errors.js';

export default class Dispatcher<T> {
  private server?: Server;
  public root?: Module<T>;

  constructor(private rootModule: Ctor<T>) {
    this.root = new Container().resolveModule(this.rootModule);
    this.server = createServer(async (req, res) => {
      const { method, url } = req;
      console.log('URL', req.url);

      if (method === 'GET') {
        try {
          const handlerConf = await Router.getHandler(
            method,
            url!,
            this.root!._controllers,
          );
          if (!handlerConf?.handler) {
            Dispatcher.notFound(res);
          } else {
            const result = await handlerConf.handler(...handlerConf.args);
            Dispatcher.ok(res, result);
          }
        } catch (err) {
          this.handleError(res, err);
        }
      } else if (method === 'POST') {
        let data = '';
        req.setEncoding('utf8');
        req.on('data', (chunk) => {
          data += chunk;
        });
        req.on('end', async () => {
          let parsedBody: unknown;
          try {
            parsedBody = JSON.parse(data);
          } catch (error) {
            Dispatcher.bad(res, 'Cannot parse body');
            return;
          }
          try {
            const handlerConf = await Router.getHandler(
              method,
              url!,
              this.root!._controllers,
              parsedBody,
            );
            if (!handlerConf?.handler) {
              Dispatcher.notFound(res);
            } else {
              const result = await handlerConf.handler(...handlerConf.args);
              Dispatcher.created(res, result);
            }
          } catch (err) {
            this.handleError(res, err);
          }
        });
        req.on('error', () => {
          Dispatcher.serverError(res);
        });
      }
    });
  }

  private handleError(res: ServerResponse, err: unknown) {
    console.error(err);
    if (err instanceof ValidationError) {
      Dispatcher.bad(
        res,
        JSON.stringify({ error: err.message, errors: err.errors }),
        'application/json',
      );
      return;
    }
    Dispatcher.serverError(res);
  }

  private static serverError(res: ServerResponse, message?: string) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(message ?? 'Server error');
  }

  private static bad(
    res: ServerResponse,
    message?: string,
    contentType?: string,
  ) {
    res.writeHead(400, { 'content-type': contentType ?? 'text/plain' });
    res.end(message ?? 'Bad request');
  }

  private static notFound(res: ServerResponse, message?: string) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end(message ?? "Resource doesn't exist");
  }

  private static ok(res: ServerResponse, data?: unknown) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private static created(res: ServerResponse, data?: unknown) {
    res.writeHead(201, { 'content-type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  public async listen(port?: number) {
    const originalListen = this.server?.listen.bind(this.server, port);
    if (originalListen) {
      const asyncListen = promisify(originalListen);
      try {
        await asyncListen();
        console.log(`Listening on port ${port}`);
      } catch (error) {
        console.log('Cannot start server');
        process.exit(1);
      }
    }
  }

  public async close() {
    if (this.server?.listening) {
      await promisify(this.server.close).apply(this.server);
    }
    console.log('No running server');
  }
}
