import type { Pipe } from '../types.js';
import { ValidationError } from '../errors.js';
import z from 'zod';
import { LogStorage } from '../context/lifecycle-log.js';

export default class ZodValidationPipe<
  T extends z.core.$ZodType,
> implements Pipe {
  constructor(private schema: T) {}

  async transform(value: any, meta: any) {
    console.log('ZodValidationPipe');
    LogStorage.write('pipe');
    try {
      const res = await z.parseAsync(this.schema, value);
      return res as any;
    } catch (error) {
      const flattened = z.flattenError(error as z.ZodError);
      const formatted = Object.entries(flattened.fieldErrors).map(
        ([field, constraints]) => ({
          field,
          constraints: constraints as string[],
        }),
      );
      throw new ValidationError({
        message: 'Validation error',
        errors: formatted,
      });
    }
  }
}
