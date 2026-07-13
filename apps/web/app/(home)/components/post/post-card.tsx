import { type PostCard } from '@repo/types';
import dayjs from 'dayjs';
import { avatarUrl } from 'lib/constants';
import Image from 'next/image';
import relativetime from 'dayjs/plugin/relativeTime';
import { cn } from 'lib/utils';
import { useEffect, useRef, useState } from 'react';
import CommentArea from './comment-area';
import { LikeTooltip } from './like-tooltip';
import {
  deletePostAction,
  likePostAction,
  loadPostLikesAction,
  unlikePostAction,
} from 'app/(home)/action';
import Link from 'next/link';
import { useCurrentUserStore } from 'store/current-user.store';
dayjs.extend(relativetime);

type Props = {
  postItem: PostCard;
  onPostDeleted?: () => void;
};

export default function PostCard({
  postItem: postDetails,
  onPostDeleted,
}: Props) {
  const user = useCurrentUserStore((state) => state.user);
  const [postItem, setPostItem] = useState(postDetails);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(postItem.commentsCount);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const likePost = async (postId: number) => {
    const previous = postItem;
    const likedUser = user
      ? { id: user.id, firstName: user.firstName, lastName: user.lastName }
      : null;

    setPostItem((current) => ({
      ...current,
      likedByMe: true,
      likesCount: current.likesCount + 1,
      likedUsers: likedUser
        ? [likedUser, ...current.likedUsers].slice(0, 5)
        : current.likedUsers,
    }));

    try {
      await likePostAction(postId);
    } catch (error: unknown) {
      setPostItem(previous);
      console.log(error);
    }
  };

  const unlikePost = async (postId: number) => {
    const previous = postItem;

    setPostItem((current) => ({
      ...current,
      likedByMe: false,
      likesCount: Math.max(0, current.likesCount - 1),
      likedUsers: user
        ? current.likedUsers.filter((u) => u.id !== user.id)
        : current.likedUsers,
    }));

    try {
      await unlikePostAction(postId);
    } catch (error: unknown) {
      setPostItem(previous);
      console.log(error);
    }
  };

  const deletePost = async (postId: number) => {
    try {
      await deletePostAction(postId);
      onPostDeleted?.();
    } catch (error: unknown) {
      console.log(error);
    }
  };

  return (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_t24 _mar_b16">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
        <div className="_feed_inner_timeline_post_top">
          <div className="_feed_inner_timeline_post_box">
            <div className="_feed_inner_timeline_post_box_image">
              <Image
                height={44}
                width={44}
                src={avatarUrl + postItem.author.firstName}
                alt="post-img"
                className="_post_img"
                unoptimized
              />
            </div>
            <div className="_feed_inner_timeline_post_box_txt">
              <h4 className="_feed_inner_timeline_post_box_title">
                {postItem.author.firstName} {postItem.author.lastName}
              </h4>
              <p className="_feed_inner_timeline_post_box_para text-capitalize">
                {dayjs(postItem.createdAt).fromNow()} .{' '}
                <span>
                  {postItem.visibility === 'PUBLIC' ? 'Public' : 'Private'}
                </span>
              </p>
            </div>
          </div>
          <div
            className="_feed_inner_timeline_post_box_dropdown"
            ref={dropdownRef}
          >
            <div className="_feed_timeline_post_dropdown">
              <button
                type="button"
                className="_feed_timeline_post_dropdown_link"
                aria-haspopup="menu"
                aria-expanded={isDropdownOpen}
                onClick={() => setIsDropdownOpen((current) => !current)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="4"
                  height="17"
                  fill="none"
                  viewBox="0 0 4 17"
                >
                  <circle cx="2" cy="2" r="2" fill="#C4C4C4" />
                  <circle cx="2" cy="8" r="2" fill="#C4C4C4" />
                  <circle cx="2" cy="15" r="2" fill="#C4C4C4" />
                </svg>
              </button>
            </div>
            {/*<!--Dropdown-->*/}
            <div
              className="_feed_timeline_dropdown _timeline_dropdown"
              role="menu"
              aria-hidden={!isDropdownOpen}
              style={{
                opacity: isDropdownOpen ? 1 : 0,
                visibility: isDropdownOpen ? 'visible' : 'hidden',
                pointerEvents: isDropdownOpen ? 'auto' : 'none',
              }}
            >
              <ul className="_feed_timeline_dropdown_list">
                <li className="_feed_timeline_dropdown_item">
                  <Link
                    href="/"
                    className="_feed_timeline_dropdown_link"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        fill="none"
                        viewBox="0 0 18 18"
                      >
                        <path
                          stroke="#1890FF"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.2"
                          d="M14.25 15.75L9 12l-5.25 3.75v-12a1.5 1.5 0 011.5-1.5h7.5a1.5 1.5 0 011.5 1.5v12z"
                        />
                      </svg>
                    </span>
                    Save Post
                  </Link>
                </li>
                <li className="_feed_timeline_dropdown_item">
                  <Link
                    href="/"
                    className="_feed_timeline_dropdown_link"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="22"
                        fill="none"
                        viewBox="0 0 20 22"
                      >
                        <path
                          fill="#377DFF"
                          fillRule="evenodd"
                          d="M7.547 19.55c.533.59 1.218.915 1.93.915.714 0 1.403-.324 1.938-.916a.777.777 0 011.09-.056c.318.284.344.77.058 1.084-.832.917-1.927 1.423-3.086 1.423h-.002c-1.155-.001-2.248-.506-3.077-1.424a.762.762 0 01.057-1.083.774.774 0 011.092.057zM9.527 0c4.58 0 7.657 3.543 7.657 6.85 0 1.702.436 2.424.899 3.19.457.754.976 1.612.976 3.233-.36 4.14-4.713 4.478-9.531 4.478-4.818 0-9.172-.337-9.528-4.413-.003-1.686.515-2.544.973-3.299l.161-.27c.398-.679.737-1.417.737-2.918C1.871 3.543 4.948 0 9.528 0zm0 1.535c-3.6 0-6.11 2.802-6.11 5.316 0 2.127-.595 3.11-1.12 3.978-.422.697-.755 1.247-.755 2.444.173 1.93 1.455 2.944 7.986 2.944 6.494 0 7.817-1.06 7.988-3.01-.003-1.13-.336-1.681-.757-2.378-.526-.868-1.12-1.851-1.12-3.978 0-2.514-2.51-5.316-6.111-5.316z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    Turn On Notification
                  </Link>
                </li>
                <li className="_feed_timeline_dropdown_item">
                  <Link
                    href="/"
                    className="_feed_timeline_dropdown_link"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        fill="none"
                        viewBox="0 0 18 18"
                      >
                        <path
                          stroke="#1890FF"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.2"
                          d="M14.25 2.25H3.75a1.5 1.5 0 00-1.5 1.5v10.5a1.5 1.5 0 001.5 1.5h10.5a1.5 1.5 0 001.5-1.5V3.75a1.5 1.5 0 00-1.5-1.5zM6.75 6.75l4.5 4.5M11.25 6.75l-4.5 4.5"
                        />
                      </svg>
                    </span>
                    Hide
                  </Link>
                </li>
                <li className="_feed_timeline_dropdown_item">
                  <Link
                    href="/"
                    className="_feed_timeline_dropdown_link"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        fill="none"
                        viewBox="0 0 18 18"
                      >
                        <path
                          stroke="#1890FF"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.2"
                          d="M8.25 3H3a1.5 1.5 0 00-1.5 1.5V15A1.5 1.5 0 003 16.5h10.5A1.5 1.5 0 0015 15V9.75"
                        />
                        <path
                          stroke="#1890FF"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.2"
                          d="M13.875 1.875a1.591 1.591 0 112.25 2.25L9 11.25 6 12l.75-3 7.125-7.125z"
                        />
                      </svg>
                    </span>
                    Edit Post
                  </Link>
                </li>
                {user?.email === postItem.author.email ? (
                  <li className="_feed_timeline_dropdown_item">
                    <span
                      style={{
                        cursor: 'pointer',
                      }}
                      className="_feed_timeline_dropdown_link"
                      onClick={() => {
                        deletePost(postItem.id);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          fill="none"
                          viewBox="0 0 18 18"
                        >
                          <path
                            stroke="#1890FF"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.2"
                            d="M2.25 4.5h13.5M6 4.5V3a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0112 3v1.5m2.25 0V15a1.5 1.5 0 01-1.5 1.5h-7.5a1.5 1.5 0 01-1.5-1.5V4.5h10.5zM7.5 8.25v4.5M10.5 8.25v4.5"
                          />
                        </svg>
                      </span>
                      Delete Post
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
        <h4 className="_feed_inner_timeline_post_title">{postItem.content}</h4>
        {postItem.imageUrl ? (
          <div className="_feed_inner_timeline_image">
            <Image
              width={498}
              height={328}
              src={postItem.imageUrl}
              alt="time-img"
              className="_time_img"
              loading="eager"
            />
          </div>
        ) : null}
      </div>
      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
        {postItem.likesCount > 0 ? (
          <LikeTooltip
            likesCount={postItem.likesCount}
            entityKey={`post-likes-${postItem.id}`}
            fetchLikes={(cursor, limit) =>
              loadPostLikesAction(postItem.id, cursor, limit)
            }
          >
            <div className="_feed_inner_timeline_total_reacts_image">
              {postItem.likedUsers.map((likedUsers, index) => (
                <Image
                  key={postItem.id + ':' + 'likes:' + likedUsers.firstName}
                  width={30}
                  height={30}
                  src={avatarUrl + likedUsers.firstName}
                  alt="Image"
                  className={cn(
                    index === 0
                      ? '_react_img1'
                      : index === 1
                        ? '_react_img'
                        : index > 1
                          ? '_react_img _rect_img_mbl_none'
                          : '',
                  )}
                  unoptimized
                />
              ))}
              {postItem.likesCount > 5 ? (
                <p className="_feed_inner_timeline_total_reacts_para">
                  {postItem.likesCount - 5}+
                </p>
              ) : null}
            </div>
          </LikeTooltip>
        ) : (
          <div className="_feed_inner_timeline_total_reacts_image" />
        )}
        <div className="_feed_inner_timeline_total_reacts_txt">
          <p
            onClick={() => setIsCommentsOpen(!isCommentsOpen)}
            style={{
              cursor: 'pointer',
            }}
            className="_feed_inner_timeline_total_reacts_para1"
          >
            <span>{commentsCount}</span> Comment
            {commentsCount > 1 ? 's' : ''}
          </p>
          <p className="_feed_inner_timeline_total_reacts_para2">
            <span>{postItem.likesCount}</span> Like
            {postItem.likesCount > 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <div
        className={cn(
          '_feed_inner_timeline_reaction ',
          isCommentsOpen ? '' : '_b_radious6',
        )}
      >
        <button
          onClick={() => {
            if (postItem.likedByMe) {
              unlikePost(postItem.id);
            } else {
              likePost(postItem.id);
            }
          }}
          className={cn(
            '_feed_inner_timeline_reaction_emoji _feed_reaction',
            postItem.likedByMe ? ' _feed_reaction_active' : '',
          )}
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span className={cn(postItem.likedByMe ? '_reaction_like' : '')}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-thumbs-up mb-1"
              >
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>{' '}
              Like
            </span>
          </span>
        </button>
        <button
          onClick={() => setIsCommentsOpen(!isCommentsOpen)}
          className={cn(
            '_feed_inner_timeline_reaction_comment _feed_reaction',
            isCommentsOpen ? '_feed_reaction_comment_active' : '',
          )}
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span>
              <svg
                className="_reaction_svg"
                xmlns="http://www.w3.org/2000/svg"
                width="21"
                height="21"
                fill="none"
                viewBox="0 0 21 21"
              >
                <path
                  stroke="#000"
                  d="M1 10.5c0-.464 0-.696.009-.893A9 9 0 019.607 1.01C9.804 1 10.036 1 10.5 1v0c.464 0 .696 0 .893.009a9 9 0 018.598 8.598c.009.197.009.429.009.893v6.046c0 1.36 0 2.041-.317 2.535a2 2 0 01-.602.602c-.494.317-1.174.317-2.535.317H10.5c-.464 0-.696 0-.893-.009a9 9 0 01-8.598-8.598C1 11.196 1 10.964 1 10.5v0z"
                />
                <path
                  stroke="#000"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.938 9.313h7.125M10.5 14.063h3.563"
                />
              </svg>{' '}
              Comment
            </span>
          </span>
        </button>
        <button className="_feed_inner_timeline_reaction_share _feed_reaction">
          <span className="_feed_inner_timeline_reaction_link">
            {' '}
            <span>
              <svg
                className="_reaction_svg"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="21"
                fill="none"
                viewBox="0 0 24 21"
              >
                <path
                  stroke="#000"
                  strokeLinejoin="round"
                  d="M23 10.5L12.917 1v5.429C3.267 6.429 1 13.258 1 20c2.785-3.52 5.248-5.429 11.917-5.429V20L23 10.5z"
                />
              </svg>{' '}
              Share
            </span>
          </span>
        </button>
      </div>
      {isCommentsOpen ? (
        <CommentArea
          postId={postItem.id}
          totalComments={commentsCount}
          setCommentCount={setCommentsCount}
        />
      ) : null}
    </div>
  );
}
