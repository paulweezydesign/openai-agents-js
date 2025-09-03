import type { StructuredSchema } from './index';
import type { ZodTypeAny } from 'zod';

export function fromZod<T>(schema: ZodTypeAny): StructuredSchema<T> {
  return {
    parse: (input: unknown) => schema.parse(input),
  } as StructuredSchema<T>;
}

