/**
 * Файл-менеджер — все API операции для работы с моделями
 * Инкапсулирует загрузку, выгрузку и обработку файлов
 */

import {
  listTeacherFiles,
  listStudentFiles,
  uploadModel,
  convertModel,
  createStudentFromScratch,
  analyzeTeacherModel,
  analyzeStudentModel,
} from '@/api.client';
import { ModelFile } from '@/types';

// ============================================================================
// Типы
// ============================================================================

export interface UploadProgressCallback {
  (percent: number): void;
}

export interface AnalysisResult {
  status: string;
  filename?: string;
  error?: string;
  architecture?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

// ============================================================================
// Утилиты форматирования
// ============================================================================

/**
 * Форматирует размер файла в человекочитаемый вид
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

/**
 * Форматирует количество параметров
 */
export function formatParams(params: number): string {
  if (params >= 1_000_000_000) return (params / 1_000_000_000).toFixed(1) + 'B';
  if (params >= 1_000_000) return (params / 1_000_000).toFixed(1) + 'M';
  return params.toString();
}

// ============================================================================
// API операции
// ============================================================================

/**
 * Загрузка списка Teacher и Student моделей
 */
export async function loadModelFiles(
  isServerAvailable: boolean,
  onTeacherAnalysisChange?: (analysis: AnalysisResult | null) => void
): Promise<{ teacherFiles: ModelFile[]; studentFiles: ModelFile[] }> {
  if (!isServerAvailable) {
    return { teacherFiles: [], studentFiles: [] };
  }

  try {
    const [teacherRes, studentRes] = await Promise.all([
      listTeacherFiles(),
      listStudentFiles(),
    ]);

    // При перезагрузке сбрасываем анализ
    onTeacherAnalysisChange?.(null);

    return {
      teacherFiles: teacherRes.models || [],
      studentFiles: studentRes.models || [],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to load files: ${msg}`);
  }
}

/**
 * Анализ Teacher модели по имени файла
 */
export async function analyzeTeacherFile(
  filename: string,
  onTeacherAnalysisChange?: (analysis: AnalysisResult | null) => void
): Promise<AnalysisResult> {
  try {
    // Извлекаем только имя файла без пути
    const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
    const analysis: AnalysisResult = await analyzeTeacherModel(cleanFilename);

    if (analysis.status === 'success') {
      onTeacherAnalysisChange?.(analysis);
    } else {
      const errorAnalysis: AnalysisResult = {
        status: 'error',
        error: analysis.error || 'Не удалось проанализировать модель',
      };
      onTeacherAnalysisChange?.(errorAnalysis);
    }

    return analysis;
  } catch (err: unknown) {
    console.error('Failed to analyze model:', err);
    const errorAnalysis: AnalysisResult = {
      status: 'error',
      error: 'Не удалось проанализировать модель',
    };
    onTeacherAnalysisChange?.(errorAnalysis);
    return errorAnalysis;
  }
}

/**
 * Анализ Student модели из config.json и model_info.json
 */
export interface StudentAnalysisResult {
  status: string;
  filename?: string;
  config?: Record<string, unknown>;
  model_info?: Record<string, unknown>;
  config_error?: string;
  info_error?: string;
  [key: string]: unknown;
}

export async function analyzeStudentFile(
  filename: string,
  onStudentAnalysisChange?: (analysis: StudentAnalysisResult | null) => void
): Promise<StudentAnalysisResult> {
  try {
    const cleanFilename = filename.split('/').pop()?.split('\\').pop() || filename;
    const analysis: StudentAnalysisResult = await analyzeStudentModel(cleanFilename);

    if (analysis.status === 'success') {
      onStudentAnalysisChange?.(analysis);
    } else {
      const errorAnalysis: StudentAnalysisResult = {
        status: 'error',
        error: analysis.error || 'Не удалось проанализировать Student модель',
      };
      onStudentAnalysisChange?.(errorAnalysis);
    }

    return analysis;
  } catch (err: unknown) {
    console.error('Failed to analyze student model:', err);
    const errorAnalysis: StudentAnalysisResult = {
      status: 'error',
      error: 'Не удалось проанализировать Student модель',
    };
    onStudentAnalysisChange?.(errorAnalysis);
    return errorAnalysis;
  }
}

/**
 * Загрузка файла модели на сервер
 */
export async function uploadModelFile(
  file: File,
  onProgress: UploadProgressCallback,
  onFilesLoaded?: () => void
): Promise<void> {
  try {
    const response = await uploadModel(file, 'teacher', onProgress);
    if (response.status === 'success') {
      await onFilesLoaded?.();
      // Показать 100% и скрыть прогресс через 1.5 сек
      onProgress(100);
      setTimeout(() => {
        onProgress(0);
      }, 1500);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to upload: ${msg}`);
  }
}

/**
 * Конвертация Teacher -> Student с параметрами по умолчанию
 * @deprecated Используйте convertStudent для настройки параметров
 */
export async function convertTeacherToStudent(
  selectedFile: ModelFile,
  outputPath: string,
  setLoading?: (loading: boolean) => void,
  onFilesLoaded?: () => void,
  setOutputPath?: (path: string) => void,
  onProgress?: ConvertProgressCallback
): Promise<{ success: boolean; error?: string }> {
  // Используем convertStudent с параметрами по умолчанию
  return convertStudent(
    selectedFile,
    outputPath,
    setLoading,
    onFilesLoaded,
    setOutputPath,
    onProgress,
    {
      hidden_size_ratio: 0.5,
      num_layers_ratio: 0.4,
      num_heads_ratio: 0.5,
      target_compression_ratio: 0.1,
      quantization: 'Q4_0',
      max_seq_length: 512,
    }
  );
}

/**
 * Конвертация Teacher модели в Student модель
 * Основной метод для дистилляции знаний
 * @param selectedFile - файл Teacher модели
 * @param outputPath - директория для сохранения Student
 * @param conversionConfig - параметры конвертации (hidden_size_ratio, num_layers_ratio и т.д.)
 */
export interface ConvertProgressCallback {
  (progress: number, stage: string): void;
}

export interface StudentConversionConfig {
  hidden_size_ratio: number;
  num_layers_ratio: number;
  num_heads_ratio: number;
  target_compression_ratio: number;
  quantization: string;
  max_seq_length: number;
}

export async function convertStudent(
  selectedFile: ModelFile,
  outputPath: string,
  setLoading?: (loading: boolean) => void,
  onFilesLoaded?: () => void,
  setOutputPath?: (path: string) => void,
  onProgress?: ConvertProgressCallback,
  conversionConfig?: StudentConversionConfig
): Promise<{ success: boolean; error?: string }> {
  if (!outputPath.trim()) {
    return { success: false, error: 'Output path is required' };
  }

  setLoading?.(true);
  try {
    // Извлекаем только имя файла (без пути)
    const filename = selectedFile.filename;
    const baseName = filename.replace(/\.gguf$/i, '');

    // Пути относительные (без MODELS_DIR префикса) — бэкенд сам добавит MODELS_DIR
    const teacherPath = `teacher/${filename}`;
    const studentDir = outputPath.replace(/\/+$/, '');
    const studentPath = `${studentDir}/${baseName}_student.gguf`;

    onProgress?.(10, 'Инициализация конвертации...');
    console.log('Converting:', teacherPath, '->', studentPath);

    const response = await convertModel(teacherPath, studentPath);
    console.log('Convert response:', response);

    if (response.status === 'error') {
      return { success: false, error: response.error_message || 'Conversion failed' };
    }

    onProgress?.(100, 'Конвертация завершена!');
    await onFilesLoaded?.();
    setOutputPath?.('student/');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Convert error:', err);
    return { success: false, error: `Failed to convert: ${msg}` };
  } finally {
    setLoading?.(false);
  }
}

/**
 * Создание Student модели с нуля
 */
export async function createStudentFromScratchAPI(
  studentArch: Record<string, unknown>,
  setLoading?: (loading: boolean) => void,
  onFilesLoaded?: () => void,
  setShowDialog?: (show: boolean) => void
): Promise<{ success: boolean; error?: string }> {
  setLoading?.(true);
  try {
    await createStudentFromScratch(studentArch as Record<string, unknown>);
    await onFilesLoaded?.();
    setShowDialog?.(false);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Failed to create student: ${msg}` };
  } finally {
    setLoading?.(false);
  }
}
