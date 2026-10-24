/**
 * dataset-api.ts
 * 
 * API функции для работы с датасетами (Stage 3)
 * Инкапсулирует все вызовы к backend dataset_processor
 */

import axios from 'axios';
import {
  DatasetFile,
  DatasetAnalysisResult,
  DatasetTemplate,
  DatasetConfig,
  ActivationAnalysisResult,
} from '@/types/dataset-panel.types';

const API_BASE = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// ============================================================================
// Утилиты
// ============================================================================

/**
 * Форматирует размер файла в человекочитаемый вид
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Определяет формат файла по расширению
 */
export function detectFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const formatMap: Record<string, string> = {
    csv: 'csv',
    json: 'json',
    parquet: 'parquet',
    tfrecord: 'tfrecord',
    npy: 'npy',
    jsonl: 'jsonl',
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    gif: 'image',
    webp: 'image',
  };
  return formatMap[ext] || 'json';
}

/**
 * Определяет тип датасета по имени файла или пути
 */
export function detectDatasetType(path: string, name: string): string {
  const combined = `${path}/${name}`.toLowerCase();
  if (combined.includes('train') || combined.includes('training')) return 'training';
  if (combined.includes('val') || combined.includes('validation')) return 'validation';
  if (combined.includes('test') || combined.includes('eval')) return 'test';
  return 'training';
}

/**
 * Форматирует дату в локальный формат
 */
export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('ru-RU');
  } catch {
    return dateStr;
  }
}

// ============================================================================
// API вызовы
// ============================================================================

/**
 * Получение списка доступных шаблонов датасетов
 */
export async function listDatasetTemplates(): Promise<DatasetTemplate[]> {
  try {
    const response = await api.get('/api/datasets/templates');
    const templateNames = response.data.templates as string[];
    
    return templateNames.map(name => ({
      name,
      description: `Шаблон: ${name}`,
      defaultCount: 100,
      supportedFormats: ['csv', 'json', 'parquet'],
      fields: [],
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to list templates: ${msg}`);
  }
}

/**
 * Создание датасета из шаблона
 */
export async function createDataset(
  templateName: string = 'default',
  count: number = 10
): Promise<Record<string, unknown>> {
  try {
    const response = await api.post('/api/datasets/create', null, {
      params: { template_name: templateName, count },
    });
    return response.data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to create dataset: ${msg}`);
  }
}

/**
 * Загрузка файла датасета на сервер
 */
export async function uploadDatasetFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Record<string, unknown>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('directory', 'datasets');

  try {
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to upload dataset: ${msg}`);
  }
}

/**
 * Получение списка датасетов в директории
 */
export async function listDatasets(): Promise<DatasetFile[]> {
  try {
    const response = await api.get('/api/models/list', {
      params: { directory: 'datasets' },
    });
    const files = response.data.files || [];
    
    return files.map((file: any) => ({
      id: file.path || file.filename,
      name: file.filename,
      path: file.path,
      size: file.size || 0,
      modified: file.modified || new Date().toISOString(),
      type: detectDatasetType(file.path || '', file.filename),
      format: detectFormat(file.filename),
      rowCount: 0,
      columnCount: 0,
      status: 'ready',
      preview: [],
      statistics: undefined,
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to list datasets: ${msg}`);
  }
}

/**
 * Анализ датасета
 */
export async function analyzeDataset(datasetPath: string): Promise<DatasetAnalysisResult> {
  try {
    // В будущем здесь будет отдельный endpoint для датасетов
    // Пока используем通用 endpoint
    const response = await api.post('/api/datasets/analyze', {
      dataset_path: datasetPath,
    });
    return response.data as DatasetAnalysisResult;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to analyze dataset: ${msg}`,
    };
  }
}

/**
 * Анализ активаций нейронной сети на датасете
 */
export async function analyzeActivations(
  datasetId: string,
  modelPath: string,
  layerNames?: string[]
): Promise<ActivationAnalysisResult> {
  try {
    const response = await api.post('/api/datasets/activations', {
      dataset_id: datasetId,
      model_path: modelPath,
      layer_names: layerNames,
    });
    return response.data as ActivationAnalysisResult;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      dataset_id: datasetId,
      model_path: modelPath,
      layers_analyzed: layerNames || [],
      activation_statistics: {
        total_neurons: 0,
        average_activation: 0,
        sparsity_percentage: 0,
        layer_details: {},
      },
      note: `Activation analysis failed: ${msg}`,
    };
  }
}

/**
 * Получение предварительного просмотра датасета
 */
export async function getDatasetPreview(
  datasetPath: string,
  numRows: number = 5
): Promise<Record<string, unknown>[]> {
  try {
    const response = await api.get('/api/datasets/preview', {
      params: { path: datasetPath, rows: numRows },
    });
    return response.data.rows || [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn(`Failed to get dataset preview: ${msg}`);
    return [];
  }
}
