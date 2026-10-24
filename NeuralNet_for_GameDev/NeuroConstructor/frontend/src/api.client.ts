import axios from 'axios';
import { Message, ChatResponse } from '@/types';

const API_BASE = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Health check
export async function checkHealth() {
  const response = await api.get('/health');
  return response.data;
}

// Chat
export async function sendChat(message: string, history: Message[] = []) {
  const response = await api.post('/api/chat', {
    message,
    history,
  });
  return response.data as ChatResponse;
}
