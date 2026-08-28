import type { MiddlewareFunc } from '../types.js';

const helloMiddleware: MiddlewareFunc = (req, res, next) => {
  console.log('Hello from middleware');
  next();
};

export default helloMiddleware;
