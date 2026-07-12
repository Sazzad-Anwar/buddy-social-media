import type { ReactNode } from 'react';
import { loggedInUserDetails } from '../(auth)/action';
import type { User } from '@repo/types';
import Header from './components/header';

export default async function HomeLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = (await loggedInUserDetails()) as User;

  return (
    <div className="_main_layout">
      <Header user={user} />
      {children}
    </div>
  );
}
