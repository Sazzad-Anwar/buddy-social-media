import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { setNextResponseCookies } from 'lib/auth-cookies';

const url = process.env.API_URL;

export async function POST() {
  const cookieStore = await cookies();

  const refresh = await fetch(`${url}/auth/refresh`, {
    method: 'POST',
    headers: {
      Cookie: cookieStore.toString(),
    },
    credentials: 'include',
  });

  if (!refresh.ok) {
    return NextResponse.json(
      { message: 'Unable to refresh session' },
      { status: refresh.status },
    );
  }

  const response = NextResponse.json(await refresh.json());
  setNextResponseCookies(response, refresh.headers.getSetCookie());

  return response;
}
