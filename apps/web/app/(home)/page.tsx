import { User } from '@repo/types';
import { loggedInUserDetails } from '../(auth)/action';
import Header from './components/header';

export default async function Home() {
  return (
    <div className="_main_layout">
      <Header />
    </div>
  );
}
