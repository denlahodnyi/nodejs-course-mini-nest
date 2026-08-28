import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Pipe } from '../types.js';
import { ValidationError } from '../errors.js';

export default class ValidationPipe implements Pipe {
  async transform(value: any, meta: any) {
    console.log('ValidationPipe');
    if (!meta || !this.canValidate(meta)) {
      return value;
    }
    const object = plainToInstance(meta, value);
    const errors = await validate(object);
    if (errors.length > 0) {
      throw new ValidationError({
        message: 'Validation error',
        errors: errors.map((e) => ({
          field: e.property,
          constraints: Object.values(e.constraints ?? {}),
        })),
      });
    }
    return object;
  }

  private canValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
