export type CursorScalar = string | number;

export interface CursorPageRequest {
  cursor?: string;
  limit?: number;
}

export interface CursorPageResult<T> {
  items: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface CursorToken<TCursor extends Record<string, CursorScalar>> {
  data: TCursor;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export function normalizeCursorLimit(limit?: number): number {
  if (!Number.isFinite(limit ?? NaN)) {
    return DEFAULT_LIMIT;
  }

  const value = Math.trunc(limit ?? DEFAULT_LIMIT);

  if (value < 1) {
    return 1;
  }

  if (value > MAX_LIMIT) {
    return MAX_LIMIT;
  }

  return value;
}

export function encodeCursor<TCursor extends Record<string, CursorScalar>>(
  data: TCursor,
): string {
  return Buffer.from(JSON.stringify({ data }), 'utf8').toString('base64url');
}

export function decodeCursor<TCursor extends Record<string, CursorScalar>>(
  cursor?: string,
): TCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as CursorToken<TCursor>;

    if (!parsed?.data || typeof parsed.data !== 'object') {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

