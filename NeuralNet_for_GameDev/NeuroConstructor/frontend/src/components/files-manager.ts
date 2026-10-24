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
 * Конвертация Teacher -> Student
 */
export async function convertTeacherToStudent(
  selectedFile: ModelFile,
  outputPath: string,
  setLoading?: (loading: boolean) => void,
  onFilesLoaded?: () => void,
  setOutputPath?: (path: string) => void
): Promise<{ success: boolean; error?: string }> {
  if (!outputPath.trim()) {
    return { success: false, error: 'Output path is required' };
  }

  setLoading?.(true);
  try {
    const teacherPath = `models/teacher/${selectedFile.filename}`;
    await convertModel(teacherPath, outputPath);
    await onFilesLoaded?.();
    setOutputPath?.('models/student/');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
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
