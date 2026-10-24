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

export interface ModelFile {
  filename: string;
  path: string;
  size: number;
  modified: string;
}

export interface ModelArchitecture {
  model_family: string;
  vocab_size: number;
  hidden_size: number;
  num_layers: number;
  num_heads: number;
  head_dim: number;
  max_position_embeddings: number;
  rope_theta: number;
  quantization?: string;
  bos_token_id?: number;
  eos_token_id?: number;
  pad_token_id?: number;
}

export interface ModelParameters {
  total_params: number;
  trainable_params: number;
  tensor_count: number;
  file_size_gb: number;
  file_size_bytes?: number;
}

export interface ModelCompression {
  applied: boolean;
  method: string;
  ratio: number;
  target_compression_ratio: number;
  quantization: string;
  specialized_layers: string[];
  compressed_size_gb?: number;
}

export interface TeacherModel {
  model_type: string;
  format: string;
  path: string;
  loaded: boolean;
  architecture: ModelArchitecture;
  parameters: ModelParameters;
  diagnostics: Record<string, unknown>;
  validation: {
    compatible: boolean;
    score: number;
    issues: string[];
    warnings: string[];
    recommendations: string[];
  };
  file_size_bytes: number;
}

export interface StudentModel {
  model_type: string;
  architecture: ModelArchitecture;
  loading: {
    initialized: boolean;
    weights_loaded: boolean;
    compression_applied: boolean;
    teacher_model?: string;
  };
  parameters: ModelParameters;
  compression: ModelCompression;
  metadata: {
    created: string;
    version: string;
    teacher_model_info: TeacherModel;
  };
  path: string;
  file_size_bytes: number;
}

export interface ModelInfo {
  teachers: TeacherModel[];
  students: StudentModel[];
}
