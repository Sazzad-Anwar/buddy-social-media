'use client';

import { useEffect } from 'react';
import type { User } from '@repo/types';
import { useCurrentUserStore } from '../../../store/current-user.store';

type Props = {
  user: User;
};

export default function CurrentUserHydrator({ user }: Props) {
  const setUser = useCurrentUserStore((state) => state.setUser);

  useEffect(() => {
    setUser(user);
  }, [setUser, user]);

  return null;
}
