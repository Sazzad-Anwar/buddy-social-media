import CreatePost from './components/create-post';
import FeedArea from './components/feed-area';
import LeftSidebar from './components/left-sidebar';
import RightSidebar from './components/right-sidebar';

export default async function Home() {
  return (
    <div className="container _custom_container">
      <div className="_layout_inner_wrap">
        <div className="row">
          <LeftSidebar />
          <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
            <div className="_layout_middle_wrap">
              <div className="_layout_middle_inner">
                <CreatePost />
                <FeedArea />
              </div>
            </div>
          </div>
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}
