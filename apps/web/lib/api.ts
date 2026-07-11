// lib/api.ts
'use server';
import { revalidateTokens } from 'app/(auth)/action';
import { cookies } from 'next/headers';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get('access_token')?.value;

  const request = async (token?: string) =>
    fetch(`${process.env.API_URL}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

  let res = await request(accessToken);

  if (res.status !== 401) return res.json();

  const newToken = await revalidateTokens();
  res = await request(newToken.access_token);
  return res.json();
}
