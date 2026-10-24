export interface Plugin {
  path: string;
  name: string;
  version: string;
  description: string;
  type: string;
  hasUI: boolean;
  capabilities: string[];
  lastModified: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  message: string;
  is_error: boolean;
  error_detail?: string;
}
