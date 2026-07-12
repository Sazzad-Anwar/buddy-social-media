import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Invalid email address').nonempty('Email is required'),
  password: z.string().nonempty('Password is required'),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string(),
});

export const createUserSchema = z.object({
  firstName: z.string().min(2, 'Name must be at least 2 characters long'),
  lastName: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.email('Invalid email address').nonempty('Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const roleSchema = z.enum(['USER']);

export const UserSchema = createUserSchema
  .omit({
    password: true,
  })
  .extend({
    role: roleSchema,
  });

export const userSummarySchema = UserSchema.extend({
  id: z.number().int(),
});

export const postVisibilitySchema = z.enum(['PUBLIC', 'PRIVATE']);

export const postImageStatusSchema = z.enum(['PENDING', 'READY', 'FAILED']);

export const postAuthorSchema = userSummarySchema;

export const createPostSchema = z.object({
  content: z.string().min(1, 'Post content is required').max(5000),
  visibility: postVisibilitySchema.default('PUBLIC'),
});

export const updatePostSchema = createPostSchema.partial();

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const postCardSchema = z.object({
  id: z.number().int(),
  content: z.string(),
  imageUrl: z.string().nullable(),
  imageStatus: postImageStatusSchema,
  visibility: postVisibilitySchema,
  commentsCount: z.number().int(),
  likesCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: postAuthorSchema,
  likedUsers: z.array(
    z.object({
      id: z.number().int(),
      firstName: z.string(),
      lastName: z.string(),
    }),
  ),
  likedByMe: z.boolean(),
});

export const postLikeUserSchema = z.object({
  id: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  role: roleSchema,
  likedAt: z.string(),
});

export const commentLikePreviewUserSchema = z.object({
  id: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(2000),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(2000),
});

export const commentCardSchema = z.object({
  id: z.number().int(),
  postId: z.number().int(),
  content: z.string(),
  repliesCount: z.number().int(),
  likesCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: postAuthorSchema,
  likedUsers: z.array(commentLikePreviewUserSchema).max(5),
  likedByMe: z.boolean(),
});

export const uploadedImageMetaSchema = z.object({
  key: z.string(),
  url: z.string().url(),
  name: z.string(),
  size: z.number().int().nonnegative(),
});

export const temporaryPostImageSchema = z.object({
  postId: z.number().int(),
  tempPath: z.string().min(1),
  originalName: z.string().min(1),
  size: z.number().int().nonnegative(),
  mimetype: z.string().min(1),
});

export const processPostImageJobSchema = temporaryPostImageSchema;

export const processedPostImageSchema = z.object({
  buffer: z.instanceof(Uint8Array),
  name: z.string().min(1),
  mimetype: z.literal('image/webp'),
});

export const cursorPageSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    hasNextPage: z.boolean(),
  });

export type User = z.infer<typeof UserSchema> & {
  id: number;
};

export type LoginDto = z.infer<typeof loginSchema>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type Role = z.infer<typeof roleSchema>;
export type PostVisibility = z.infer<typeof postVisibilitySchema>;
export type PostImageStatus = z.infer<typeof postImageStatusSchema>;
export type CreatePostDto = z.infer<typeof createPostSchema>;
export type UpdatePostDto = z.infer<typeof updatePostSchema>;
export type CursorPaginationDto = z.infer<typeof cursorPaginationSchema>;
export type PostAuthor = z.infer<typeof postAuthorSchema>;
export type PostCard = z.infer<typeof postCardSchema>;
export type PostLikeUser = z.infer<typeof postLikeUserSchema>;
export type PostLikePreviewUser = z.infer<
  typeof postCardSchema.shape.likedUsers
>[number];
export type CommentLikePreviewUser = z.infer<
  typeof commentLikePreviewUserSchema
>;
export type CreateCommentDto = z.infer<typeof createCommentSchema>;
export type UpdateCommentDto = z.infer<typeof updateCommentSchema>;
export type CommentCard = z.infer<typeof commentCardSchema>;
export type UploadedImageMeta = z.infer<typeof uploadedImageMetaSchema>;
export type TemporaryPostImage = z.infer<typeof temporaryPostImageSchema>;
export type ProcessPostImageJob = z.infer<typeof processPostImageJobSchema>;
export type ProcessedPostImage = z.infer<typeof processedPostImageSchema>;
