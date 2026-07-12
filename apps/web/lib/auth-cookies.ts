import setCookieParser from 'set-cookie-parser';
import { NextResponse } from 'next/server';

export type CookieHeaderTarget = {
  set(name: string, value: string, options: Record<string, unknown>): void;
  delete(name: string): void;
};

type ParsedCookie = {
  name: string;
  value: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
  expires?: Date;
  maxAge?: number;
  path?: string;
  domain?: string;
};

const cookieOptions = (cookie: ParsedCookie) => ({
  httpOnly: cookie.httpOnly,
  secure: cookie.secure,
  sameSite: cookie.sameSite?.toLowerCase() as
    | 'strict'
    | 'lax'
    | 'none'
    | undefined,
  expires: cookie.expires,
  maxAge: cookie.maxAge,
  path: cookie.path,
  domain: cookie.domain,
});

export function setNextResponseCookies(
  response: NextResponse,
  setCookies: string[],
) {
  const parsedCookies = setCookieParser.parse(setCookies);

  for (const cookie of parsedCookies) {
    response.cookies.set(cookie.name, cookie.value, cookieOptions(cookie));
  }
}

export function setResponseCookies(
  response: NextResponse,
  setCookies: string[],
) {
  setNextResponseCookies(response, setCookies);
}

export function deleteAuthCookies(target: CookieHeaderTarget) {
  target.delete('access_token');
  target.delete('refresh_token');
}
