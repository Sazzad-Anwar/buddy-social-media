import CreatePost from './components/post/create-post';
import FeedArea from './components/home/feed-area';
import LeftSidebar from './components/home/left-sidebar';
import RightSidebar from './components/home/right-sidebar';
import { Suspense } from 'react';
import { FeedPage } from '@repo/types';
import { api } from 'lib/server-api';

export default async function Home() {
  const initialFeed = await api<FeedPage>('/post?limit=20', {
    cache: 'no-store',
    next: {
      tags: ['feed'],
    },
  });

  return (
    <div className="container _custom_container">
      <div className="_layout_inner_wrap">
        <div className="row">
          <LeftSidebar />
          <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
            <div className="_layout_middle_wrap">
              <div className="_layout_middle_inner">
                <CreatePost />
                <Suspense fallback={<>Loading</>}>
                  <FeedArea initialFeed={initialFeed} />
                </Suspense>
              </div>
            </div>
          </div>
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}
