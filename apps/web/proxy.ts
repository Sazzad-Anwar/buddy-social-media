import { NextResponse, type NextRequest } from 'next/server';
import {
  deleteAuthCookies,
  setResponseCookies,
} from 'lib/auth-cookies';

const url = process.env.API_URL;
const authPaths = ['/login', '/registration'];

function isJwtExpired(token: string | undefined) {
  if (!token) {
    return true;
  }

  try {
    const [, payload] = token.split('.');
    if (!payload) {
      return true;
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const json = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof json.exp !== 'number') {
      return true;
    }

    return Date.now() >= json.exp * 1000;
  } catch {
    return true;
  }
}

async function refreshSession(request: NextRequest) {
  const refresh = await fetch(`${url}/auth/refresh`, {
    method: 'POST',
    headers: {
      Cookie: request.headers.get('cookie') ?? '',
    },
    credentials: 'include',
  });

  if (!refresh.ok) {
    return null;
  }

  return refresh;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const hasSession = Boolean(accessToken || refreshToken);

  if (
    hasSession &&
    authPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (pathname === '/') {
    if (accessToken && !isJwtExpired(accessToken)) {
      return NextResponse.next();
    }

    if (!refreshToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const refresh = await refreshSession(request);
    if (!refresh) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      deleteAuthCookies(response.cookies);
      return response;
    }

    const response = NextResponse.redirect(new URL(request.url));
    setResponseCookies(response, refresh.headers.getSetCookie());
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/registration'],
};
