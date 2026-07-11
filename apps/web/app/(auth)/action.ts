'use server';

import { LoginDto, CreateUserDto } from '@repo/types';
import { api } from 'lib/api';
import { revlidateTags } from 'lib/constants';
import { cookies } from 'next/headers';
import { redirect, RedirectType } from 'next/navigation';
import setCookieParser from 'set-cookie-parser';

const url = process.env.API_URL;

export const setCookies = async (setCookies: string[]) => {
  const cookieStore = await cookies();
  const parsedCookies = setCookieParser.parse(setCookies);

  for (const cookie of parsedCookies) {
    cookieStore.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite?.toLowerCase() as
        'strict' | 'lax' | 'none' | undefined,
      expires: cookie.expires,
      maxAge: cookie.maxAge,
      path: cookie.path,
      domain: cookie.domain,
    });
  }
};

export const loginAction = async (loginData: LoginDto) => {
  try {
    const res = await fetch(`${url}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('Login error:', JSON.stringify(errorData, null, 2));
      throw new Error(errorData.message || 'Failed to login');
    }

    await setCookies(res.headers.getSetCookie());
  } catch (error) {
    console.error('LoginAction caught error:', error);
    throw error;
  }

  // Only reached when the request succeeded → perform the redirect
  redirect('/', RedirectType.push);
};

export const registerAction = async (registerData: CreateUserDto) => {
  try {
    const res = await fetch(`${url}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('Registration error:', JSON.stringify(errorData, null, 2));
      throw new Error(errorData.message || 'Failed to register');
    }

    await setCookies(res.headers.getSetCookie());
  } catch (error) {
    console.error('RegisterAction caught error:', error);
    throw error;
  }

  // Only reached when the request succeeded → perform the redirect
  redirect('/', RedirectType.push);
};

export const loggedInUserDetails = async () => {
  const data = await api(`/user/me`, {
    cache: 'force-cache',
    next: {
      tags: [revlidateTags.MY_PROFILE],
      revalidate: 120,
    },
  });
  return data;
};

export const revalidateTokens = async () => {
  const cookieStore = await cookies();
  const refresh = await fetch(`${url}/auth/refresh`, {
    method: 'POST',
    headers: {
      Cookie: cookieStore.toString(),
    },
    credentials: 'include',
  });

  if (!refresh.ok) {
    redirect('/login');
  }

  setCookies(refresh.headers.getSetCookie());
  return await refresh.json();
};

export const logout = async () => {
  const cookieStore = await cookies();

  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');

  redirect('/login', RedirectType.replace);
};
