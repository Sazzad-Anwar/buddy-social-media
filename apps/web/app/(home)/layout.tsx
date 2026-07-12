import type { ReactNode } from 'react';
import { loggedInUserDetails } from '../(auth)/action';
import type { User } from '@repo/types';
import Header from './components/header';
import ThemeToggle from './components/theme-toogle';

export default async function HomeLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = (await loggedInUserDetails()) as User;

  return (
    <div id="theme-root" className="_layout _layout_main_wrapper">
      <ThemeToggle />
      <div className="_main_layout">
        <Header user={user} />
        {children}
      </div>
    </div>
  );
}
