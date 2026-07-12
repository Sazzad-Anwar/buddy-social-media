// lib/api.ts
'use server';
import { cookies, headers } from 'next/headers';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get('access_token')?.value;

  const request = async (token?: string) =>
    fetch(`${process.env.API_URL}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await request(accessToken);

  if (res.status === 401) {
    const headerList = await headers();
    const host =
      headerList.get('x-forwarded-host') ??
      headerList.get('host') ??
      'localhost:3001';
    const protocol = headerList.get('x-forwarded-proto') ?? 'http';
    const appUrl = `${protocol}://${host}`;

    const refresh = await fetch(`${appUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: cookieStore.toString(),
      },
      credentials: 'include',
    });

    if (!refresh.ok) {
      throw new Error('UNAUTHORIZED');
    }

    const newToken = (await refresh.json()) as { access_token: string };
    res = await request(newToken.access_token);
  }

  return res.json();
}
