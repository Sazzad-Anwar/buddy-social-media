import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function proxy(request: NextRequest) {
  const cookieStore = await cookies();
  // Check for both access_token and accessToken
  const token = cookieStore.get('access_token')?.value;
  const { pathname } = request.nextUrl;

  const authPaths = ['/login', '/registration'];

  if (
    token &&
    authPaths.some(
      (path) => pathname === path || pathname.startsWith(path + '/'),
    )
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/registration', '/register'],
};
