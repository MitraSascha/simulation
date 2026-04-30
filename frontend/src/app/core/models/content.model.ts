export type Platform = 'feedbook' | 'threadit';
export type ReactionType = 'like' | 'dislike' | 'share';

export interface Post {
  id: string;
  simulation_id: string;
  author_id: string;
  platform: Platform;
  content: string;
  ingame_day: number;
  subreddit: string | null;
  created_at: string;
  // Joined data
  author_name?: string;
  is_skeptic?: boolean;
  comments_count?: number;
  reactions_count?: number;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  ingame_day: number;
  created_at: string;
}

export interface Reaction {
  id: string;
  post_id: string;
  persona_id: string;
  reaction_type: ReactionType;
  ingame_day: number;
  created_at: string;
}

export interface InfluenceEvent {
  id: string;
  simulation_id: string;
  source_persona_id: string;
  target_persona_id: string;
  trigger_post_id: string | null;
  ingame_day: number;
  influence_type: string;
  description: string | null;
  created_at: string;
}
