/**
 * dataset-panel.types.ts
 * 
 * Типы и интерфейсы для панели датасетов (Stage 3: Dataset Processing Pipeline)
 */

// ============================================================================
// Типы датасетов
// ============================================================================

/** Тип датасета по назначению */
export type DatasetKind = 'training' | 'validation' | 'test';

/** Формат файла датасета */
export type DatasetFormat = 'csv' | 'json' | 'parquet' | 'tfrecord' | 'image' | 'npy' | 'jsonl' | 'manifest';

/** Статус обработки датасета */
export type DatasetStatus = 'ready' | 'processing' | 'error' | 'pending';

// ============================================================================
// Статистика и метаданные
// ============================================================================

export interface DatasetStatistics {
  /** Оценка качества данных (0.0 - 1.0) */
  qualityScore?: number;
  /** Количество пропущенных значений */
  missingValues?: number;
  /** Средние значения по колонкам */
  mean?: number[];
  /** Стандартные отклонения */
  std?: number[];
  /** Минимальные значения */
  min?: number[];
  /** Максимальные значения */
  max?: number[];
  /** Количество уникальных значений по колонкам */
  uniqueCounts?: number[];
}

export interface DatasetPreviewRow {
  [columnName: string]: string | number | boolean | null | object;
}

export interface DatasetManifestInfo {
  dataset_id: string;
  template_name: string;
  kind: string;
  count: number;
  created_at: string;
  status: string;
  params?: Record<string, unknown>;
  example_count?: number;
}

// ============================================================================
// Основной интерфейс датасета
// ============================================================================

export interface DatasetFile {
  /** Уникальный идентификатор датасета */
  id: string;
  /** Имя файла/датасета */
  name: string;
  /** Полный путь к файлу */
  path: string;
  /** Размер в байтах */
  size: number;
  /** Дата последнего изменения */
  modified: string;
  /** Тип датасета по назначению */
  type: DatasetKind;
  /** Формат файла */
  format: DatasetFormat;
  /** Количество строк */
  rowCount?: number;
  /** Количество столбцов */
  columnCount?: number;
  /** Статус обработки */
  status: DatasetStatus;
  /** Предварительный просмотр данных (первые N строк) */
  preview?: DatasetPreviewRow[];
  /** Статистика по данным */
  statistics?: DatasetStatistics;
  /** Манифест датасета (для Stage 3) */
  manifest?: DatasetManifestInfo;
}

// ============================================================================
// Результат анализа датасета
// ============================================================================

export interface DatasetAnalysisResult {
  success: boolean;
  dataset_info?: DatasetManifestInfo;
  examples_loaded?: number;
  preprocessing_steps?: string[];
  quality_score?: number;
  error?: string;
}

export interface ActivationStatistics {
  total_neurons: number;
  average_activation: number;
  sparsity_percentage: number;
  layer_details: Record<string, {
    average_activation: number;
    sparsity_percentage: number;
    total_activations: number;
  }>;
}

export interface ActivationAnalysisResult {
  success: boolean;
  dataset_id: string;
  model_path: string;
  layers_analyzed: string[];
  activation_statistics: ActivationStatistics;
  note?: string;
}

// ============================================================================
// Шаблоны и конфигурация
// ============================================================================

export interface DatasetTemplate {
  name: string;
  description: string;
  defaultCount: number;
  supportedFormats: DatasetFormat[];
  fields: string[];
}

export interface DatasetConfig {
  templateName: string;
  count: number;
  includeActivationAnalysis: boolean;
  includeQualityCheck: boolean;
  customParams?: Record<string, unknown>;
}

// ============================================================================
// Состояние и действия (для хуков)
// ============================================================================

export interface DatasetState {
  /** Список датасетов */
  datasets: DatasetFile[];
  /** Выбранный датасет */
  selectedDataset: DatasetFile | null;
  /** Состояние загрузки */
  loading: boolean;
  /** Последняя ошибка */
  error: string | null;
  /** Идёт ли загрузка файла */
  isUploading: boolean;
  /** Прогресс загрузки (0-100) */
  uploadProgress: number;
  /** Результат анализа датасета */
  analysisResult: DatasetAnalysisResult | null;
  /** Результат анализа активаций */
  activationResult: ActivationAnalysisResult | null;
}

export interface DatasetActions {
  /** Загрузить список датасетов */
  loadDatasets: () => Promise<void>;
  /** Выбрать датасет */
  selectDataset: (id: string) => Promise<void>;
  /** Загрузить файл датасета на сервер */
  uploadDataset: (file: File) => Promise<DatasetFile>;
  /** Проанализировать датасет */
  analyzeDataset: (id: string) => Promise<DatasetAnalysisResult>;
  /** Очистить ошибку */
  clearError: () => void;
  /** Сбросить выбранный датасет */
  deselectDataset: () => void;
}

export type UseDatasetHook = [DatasetState, DatasetActions];
