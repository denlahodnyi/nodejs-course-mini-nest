export class BadRequest extends Error {
  code = 400;
  constructor(message: string) {
    super(message);
  }
}

export class ValidationError extends BadRequest {
  errors: { field: string; constraints: string[] }[] = [];
  constructor(message?: string) {
    super(message ?? 'Validation error');
  }
}
