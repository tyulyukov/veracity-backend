import { PostFeedItem, PostWithDetails, MyPost } from './domain/post.type';
import { CommentWithAuthor } from './domain/comment.type';
import { PostResponseDto } from './dto/post-response.dto';
import { MyPostResponseDto } from './dto/my-post-response.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { AuthorDto } from './dto/author.dto';

export function mapAuthorToDto(
  authorId: string,
  firstName: string,
  lastName: string,
  avatarUrl: string | null,
  role: string,
): AuthorDto {
  return {
    id: authorId,
    firstName,
    lastName,
    avatarUrl,
    role,
  };
}

export function mapPostFeedItemToDto(post: PostFeedItem): PostResponseDto {
  return {
    id: post.id,
    text: post.text,
    imageUrls: post.image_urls,
    commentCount: post.comment_count,
    likeCount: post.like_count,
    isLikedByCurrentUser: post.is_liked_by_current_user,
    author: mapAuthorToDto(
      post.author_id,
      post.author_first_name,
      post.author_last_name,
      post.author_avatar_url,
      post.author_role,
    ),
    createdAt: post.created_at,
    updatedAt: post.updated_at,
  };
}

export function mapPostWithDetailsToDto(post: PostWithDetails): PostResponseDto {
  return mapPostFeedItemToDto(post);
}

export function mapMyPostToDto(post: MyPost): MyPostResponseDto {
  return {
    id: post.id,
    text: post.text,
    imageUrls: post.image_urls,
    commentCount: post.comment_count,
    likeCount: post.like_count,
    isLikedByCurrentUser: post.is_liked_by_current_user,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
  };
}

export function mapCommentToDto(comment: CommentWithAuthor): CommentResponseDto {
  return {
    id: comment.id,
    postId: comment.post_id,
    text: comment.text,
    author: mapAuthorToDto(
      comment.author_id,
      comment.author_first_name,
      comment.author_last_name,
      comment.author_avatar_url,
      comment.author_role,
    ),
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
  };
}
