export class HttpError extends Error {
  code = 500;
  contentType = 'text/plain';
  constructor(
    message: string | object = 'Internal server error',
    statusCode: number = 500,
  ) {
    super(typeof message === 'string' ? message : JSON.stringify(message));
    this.contentType =
      typeof message === 'string' ? 'text/plain' : 'application/json';
    this.code = statusCode;
  }
}

export class BadRequestError extends HttpError {
  code = 400;
  constructor(message: string = 'Bad request') {
    super(message);
  }
}

export class NotFoundError extends HttpError {
  code = 404;
  constructor(message: string = 'Resource not found') {
    super(message);
  }
}

export class AuthorizationError extends HttpError {
  code = 403;
  constructor(message: string = 'Unauthorized') {
    super(message);
  }
}

export class ValidationError extends HttpError {
  code: number = 400;
  contentType = 'application/json';
  constructor(
    message:
      | string
      | {
          message?: string;
          errors: { field: string; constraints: string[] }[];
        } = 'Validation error',
  ) {
    super(message);
  }
}
