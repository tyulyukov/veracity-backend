export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at: Date;
  updated_at: Date;
}

export interface CommentWithAuthor {
  id: string;
  post_id: string;
  text: string;
  created_at: Date;
  updated_at: Date;
  author_id: string;
  author_first_name: string;
  author_last_name: string;
  author_avatar_url: string | null;
  author_role: string;
}
