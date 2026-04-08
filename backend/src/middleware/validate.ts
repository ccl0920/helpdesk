import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware factory that validates request body against a Zod schema
 * @param schema - The Zod schema to validate against
 * @param location - Which part of the request to validate ('body', 'params', 'query')
 * @returns Express middleware function
 */
export function validateRequest(
  schema: ZodSchema,
  location: 'body' | 'params' | 'query' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationResult = schema.safeParse(req[location]);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || 'Invalid request data';
      return res.status(400).json({ error: errorMessage });
    }

    // Replace request data with validated data (includes type coercion)
    req[location] = validationResult.data;
    next();
  };
}
