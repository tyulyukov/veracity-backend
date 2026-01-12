export interface Author {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: string;
}

export interface Post {
  id: string;
  author_id: string;
  text: string | null;
  image_urls: string[];
  like_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface PostFeedItem {
  id: string;
  text: string | null;
  image_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: Date;
  updated_at: Date;
  author_id: string;
  author_first_name: string;
  author_last_name: string;
  author_avatar_url: string | null;
  author_role: string;
  is_liked_by_current_user: boolean;
}

export interface PostWithDetails extends PostFeedItem {}

export interface MyPost {
  id: string;
  text: string | null;
  image_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: Date;
  updated_at: Date;
  is_liked_by_current_user: boolean;
}

export interface PostLike {
  post_id: string;
  user_id: string;
  created_at: Date;
}
