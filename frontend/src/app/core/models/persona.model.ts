export interface Persona {
  id: string;
  simulation_id: string;
  name: string;
  age: string | null;
  location: string | null;
  occupation: string | null;
  personality: string | null;
  values: string[];
  communication_style: string | null;
  initial_opinion: string | null;
  is_skeptic: boolean;
  social_connections: string[];
  current_state: PersonaState;
  created_at: string;
}

export interface PersonaState {
  opinion_evolution?: string;
  mood?: string;
  recent_actions?: RecentAction[];
  platform_affinity?: Record<string, number>;
  connection_strength?: Record<string, number>;
}

export interface RecentAction {
  tick: number;
  summary: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  persona_id: string;
}
