import { cookies, headers } from 'next/headers';

function mergeHeaders(initHeaders?: HeadersInit, token?: string) {
  const merged = new Headers(initHeaders);

  if (token) {
    merged.set('Authorization', `Bearer ${token}`);
  }

  return merged;
}

async function refreshAccessToken() {
  const cookieStore = await cookies();
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

  return (await refresh.json()) as { access_token: string };
}

export async function serverRequest(path: string, init?: RequestInit) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  const request = async (token?: string) =>
    fetch(`${process.env.API_URL}${path}`, {
      ...init,
      headers: mergeHeaders(init?.headers, token),
    });

  let response = await request(accessToken);

  if (response.status === 401) {
    const { access_token } = await refreshAccessToken();
    response = await request(access_token);
  }

  return response;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await serverRequest(path, init);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(body || `Request failed with status ${response.status}`);
  }

  return body ? (JSON.parse(body) as T) : (undefined as T);
}
