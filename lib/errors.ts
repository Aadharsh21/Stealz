import type { ApiError } from './types';
import { ProviderError } from './providers/types';
import { BudgetError } from './limits';

/** An error with a message that is safe to show to shoppers. */
export class AppError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: ApiError['code'],
    public retryAfter?: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function secondsUntil(date: Date): number {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
}

/** Converts any thrown error into a shopper-friendly AppError. */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof BudgetError) {
    return new AppError(
      err.scope === 'day'
        ? "We've hit today's limit for live price checks. Popular searches still work, and the limit resets tomorrow."
        : "We've hit this month's limit for live price checks. Popular searches still work from saved results.",
      503,
      'budget',
    );
  }
  if (err instanceof ProviderError) {
    if (err.kind === 'budget') {
      return new AppError('Live price checks are paused for now because the data plan limit was reached. Please try again later.', 503, 'budget');
    }
    if (err.kind === 'config') {
      console.error('[config]', err.message);
      return new AppError('The price data service is not set up correctly yet.', 500, 'server');
    }
    if (err.kind === 'not_found') return new AppError(err.message, 404, 'not_found');
    return new AppError("Couldn't get prices right now. Please try again in a moment.", 502, 'provider');
  }
  console.error('[error]', err);
  return new AppError('Something went wrong. Please try again.', 500, 'server');
}

export function errorResponse(err: unknown): Response {
  const e = toAppError(err);
  const body: ApiError = { error: e.message, code: e.code, retryAfter: e.retryAfter };
  const headers: Record<string, string> = { 'cache-control': 'no-store' };
  if (e.retryAfter) headers['retry-after'] = String(e.retryAfter);
  return Response.json(body, { status: e.status, headers });
}
