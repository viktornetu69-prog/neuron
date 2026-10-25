import axios from 'axios';
import { Message, ChatResponse, ModelInfo, TeacherModel, StudentModel, ModelFile } from '@/types';

const API_BASE = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
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

// Models API
export async function getModels() {
  const response = await api.get('/api/models');
  return response.data as ModelInfo;
}

export async function listTeacherFiles() {
  const response = await api.get('/api/models/teacher');
  return response.data;
}

export async function listStudentFiles() {
  const response = await api.get('/api/models/student');
  return response.data;
}

export async function uploadModel(
  file: File,
  directory: 'teacher' | 'student' = 'teacher',
  onProgress?: (percent: number) => void
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('directory', directory);
  
  const response = await api.post('/api/models/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
  return response.data;
}

export async function convertModel(teacherPath: string, studentPath: string) {
  const response = await api.post('/api/models/convert', {
    teacher_path: teacherPath,
    student_path: studentPath,
  });
  return response.data;
}

export async function createStudentFromScratch(architecture?: any) {
  const response = await api.post('/api/models/student/scratch', {
    model_family: architecture?.model_family || 'qwen3',
    hidden_size: architecture?.hidden_size || 768,
    num_layers: architecture?.num_layers || 12,
    num_heads: architecture?.num_heads || 12,
    num_kv_heads: architecture?.num_kv_heads || 12,
    vocab_size: architecture?.vocab_size || 32000,
    max_position_embeddings: architecture?.max_position_embeddings || 2048,
    rope_theta: architecture?.rope_theta || 10000,
    head_dim: architecture?.head_dim || 64,
  });
  return response.data;
}

export async function validateModel(teacherModel: string, studentModel: string) {
  const response = await api.post('/api/models/validate', {
    teacher_model: teacherModel,
    student_model: studentModel,
  });
  return response.data;
}

export async function analyzeTeacherModel(filename: string) {
  // Извлекаем только имя файла без пути
  const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
  const response = await api.get(`/api/models/teacher/${encodeURIComponent(cleanFilename)}`);
  return response.data;
}

export async function analyzeStudentModel(filename: string) {
  const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
  const response = await api.get(`/api/models/student/${encodeURIComponent(cleanFilename)}`);
  return response.data;
}
