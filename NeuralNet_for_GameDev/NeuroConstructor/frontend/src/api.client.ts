import axios from 'axios';
import { Message, ChatResponse, ModelInfo, TeacherModel, StudentModel, ModelFile } from '@/types';

const STORAGE_KEY = 'neuroconstructor_settings_v2';

// Helper: get current API URL from settings
function getApiUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const settings = JSON.parse(saved);
      return settings.serverUrl || settings.apiUrl || 'http://127.0.0.1:8000';
    }
  } catch {
    // Ignore errors
  }
  return 'http://127.0.0.1:8000';
}

// Helper: get timeout from settings
function getTimeout(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const settings = JSON.parse(saved);
      return settings.requestTimeout || 300000;
    }
  } catch {
    // Ignore errors
  }
  return 300000;
}

// Create axios instance with dynamic base URL
const getApi = () => axios.create({
  baseURL: getApiUrl(),
  timeout: getTimeout(),
});

// Health check
export async function checkHealth() {
  const api = getApi();
  const response = await api.get('/health');
  return response.data;
}

// Chat
export async function sendChat(message: string, history: Message[] = []) {
  const api = getApi();
  const response = await api.post('/api/chat', {
    message,
    history,
  });
  return response.data as ChatResponse;
}

// Models API
export async function listTeacherFiles() {
  const api = getApi();
  const response = await api.get('/api/models/teacher');
  return response.data;
}

export async function listStudentFiles() {
  const api = getApi();
  const response = await api.get('/api/models/student');
  return response.data;
}

export async function uploadModel(
  file: File,
  directory: 'teacher' | 'student' = 'teacher',
  onProgress?: (percent: number) => void
) {
  const api = getApi();
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
  const api = getApi();
  const response = await api.post('/api/models/convert', {
    teacher_path: teacherPath,
    student_path: studentPath,
  });
  return response.data;
}

export interface ConvertConfig {
  teacher_path: string;
  student_path: string;
  hidden_size_ratio: number;
  num_layers_ratio: number;
  num_heads_ratio: number;
  target_compression_ratio: number;
  quantization: string;
  max_seq_length: number;
}

export async function convertModelWithConfig(config: ConvertConfig) {
  const api = getApi();
  const response = await api.post('/api/models/convert-with-config', config);
  return response.data;
}

export async function createStudentFromScratch(architecture?: any) {
  const api = getApi();
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
  const api = getApi();
  const response = await api.post('/api/models/validate', {
    teacher_model: teacherModel,
    student_model: studentModel,
  });
  return response.data;
}

export async function analyzeTeacherModel(filename: string) {
  const api = getApi();
  const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
  const response = await api.get(`/api/models/teacher/${encodeURIComponent(cleanFilename)}`);
  return response.data;
}

export async function analyzeStudentModel(filename: string) {
  const api = getApi();
  const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
  const response = await api.get(`/api/models/student/${encodeURIComponent(cleanFilename)}`);
  return response.data;
}

// ============================================================================
// Chat modes
// ============================================================================

export async function sendChatToMode(
  mode: string,
  message: string,
  history: Array<{ role: string; content: string }> = []
) {
  const api = getApi();
  const response = await api.post('/api/chat/mode', {
    mode,
    message,
    history,
  });
  return response.data;
}

export async function exportChatHistory(mode: string, messages: Array<{ role: string; content: string; timestamp: string }>) {
  const api = getApi();
  const response = await api.post('/api/chat/export', {
    mode,
    messages,
  });
  return response.data;
}

// ============================================================================
// Plugin Manager (Legacy)
// ============================================================================

export async function listPlugins() {
  const api = getApi();
  const response = await api.get('/api/plugins');
  return response.data;
}

export async function createPlugin(plugin: {
  name: string;
  description: string;
  type: string;
  version: string;
  capabilities: string[];
}) {
  const api = getApi();
  const response = await api.post('/api/plugins', plugin);
  return response.data;
}

export async function deletePlugin(pluginName: string) {
  const api = getApi();
  const response = await api.delete(`/api/plugins/${encodeURIComponent(pluginName)}`);
  return response.data;
}

// ============================================================================
// Plugin System v2 (new registry-based)
// ============================================================================

export async function getAllPlugins() {
  const api = getApi();
  const response = await api.get('/api/plugins/v2');
  return response.data;
}

export async function togglePlugin(pluginId: string) {
  const api = getApi();
  const response = await api.post(`/api/plugins/v2/${encodeURIComponent(pluginId)}/toggle`);
  return response.data;
}

export async function getPluginInfo(pluginId: string) {
  const api = getApi();
  const response = await api.get(`/api/plugins/v2/${encodeURIComponent(pluginId)}`);
  return response.data;
}

export async function executePluginMethod(pluginId: string, method: string, args?: any) {
  const api = getApi();
  const response = await api.post(`/api/plugins/v2/${encodeURIComponent(pluginId)}/execute`, {
    method,
    args: args || {},
  });
  return response.data;
}

export async function getPluginSidebarItems() {
  const api = getApi();
  const response = await api.get('/api/plugins/v2/sidebar-items');
  return response.data;
}

export async function getPluginUIPanels() {
  const api = getApi();
  const response = await api.get('/api/plugins/v2/ui-panels');
  return response.data;
}

// ============================================================================
// Benchmark API
// ============================================================================

export async function runBenchmark(config: {
  qa_pairs: number;
  chat_dialogs: number;
  code_examples: number;
  creative_tasks: number;
  output_dir: string;
  teacher_model?: string;
  student_model?: string;
}) {
  const api = getApi();
  const response = await api.post('/api/benchmark/run', config);
  return response.data;
}

export async function compareBenchmarkAnswers(teacher: string, student: string) {
  const api = getApi();
  const response = await api.post('/api/benchmark/compare', { teacher, student });
  return response.data;
}

export async function fineTuneStudent(teacherModel: string, studentModel: string) {
  const api = getApi();
  const response = await api.post('/api/benchmark/fine-tune', {
    teacher_model: teacherModel,
    student_model: studentModel,
  });
  return response.data;
}

// ============================================================================
// Visualizer API
// ============================================================================

export async function analyzeModel(filename: string) {
  const api = getApi();
  const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
  const response = await api.get(`/api/visualizer/analyze/${encodeURIComponent(cleanFilename)}`);
  return response.data;
}

export async function getModelInfo(filename: string) {
  const api = getApi();
  const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
  const response = await api.get(`/api/visualizer/info/${encodeURIComponent(cleanFilename)}`);
  return response.data;
}

export async function getTensorInfo(filename: string) {
  const api = getApi();
  const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
  const response = await api.get(`/api/visualizer/tensors/${encodeURIComponent(cleanFilename)}`);
  return response.data;
}

export async function getWeightStats(filename: string) {
  const api = getApi();
  const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
  const response = await api.get(`/api/visualizer/stats/${encodeURIComponent(cleanFilename)}`);
  return response.data;
}

export async function generateAtlas(filename: string, outputDir: string) {
  const api = getApi();
  const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
  const response = await api.post('/api/visualizer/atlas', {
    filename: cleanFilename,
    output_dir: outputDir,
  });
  return response.data;
}

export async function removeLayerFromModel(
  filename: string,
  layerIndex: number,
) {
  const api = getApi();
  const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
  const response = await api.post('/api/visualizer/edit/remove-layer', {
    filename: cleanFilename,
    layer_index: layerIndex,
  });
  return response.data;
}

export async function removeNeuronsFromModel(
  filename: string,
  layerIndex: number,
  neuronIndices: number[],
) {
  const api = getApi();
  const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
  const response = await api.post('/api/visualizer/edit/remove-neurons', {
    filename: cleanFilename,
    layer_index: layerIndex,
    neuron_indices: neuronIndices,
  });
  return response.data;
}

export async function zeroOutWeightsInModel(
  filename: string,
  layerIndex: number,
  neuronIndices: number[],
) {
  const api = getApi();
  const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
  const response = await api.post('/api/visualizer/edit/zero-weights', {
    filename: cleanFilename,
    layer_index: layerIndex,
    neuron_indices: neuronIndices,
  });
  return response.data;
}

export async function exportEditedModel(
  filename: string,
  outputPath: string,
) {
  const api = getApi();
  const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
  const response = await api.post('/api/visualizer/edit/export', {
    filename: cleanFilename,
    output_path: outputPath,
  });
  return response.data;
}

export async function getEditOperations(filename: string) {
  const api = getApi();
  const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
  const response = await api.get(`/api/visualizer/edit/operations/${encodeURIComponent(cleanFilename)}`);
  return response.data;
}
