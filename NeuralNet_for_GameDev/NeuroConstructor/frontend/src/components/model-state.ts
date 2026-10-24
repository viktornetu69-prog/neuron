/**
 * Хук управления состоянием моделей (Teacher/Student pipeline)
 * Централизует все состояния: файлы, загрузка, ошибки, анализ
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ModelFile } from '@/types';
import {
  loadModelFiles,
  analyzeTeacherFile,
  uploadModelFile,
} from './files-manager';

// ============================================================================
// Типы
// ============================================================================

export interface ModelState {
  // Данные
  teacherFiles: ModelFile[];
  studentFiles: ModelFile[];
  selectedFile: ModelFile | null;
  teacherAnalysis: any | null;

  // Состояния UI
  loading: boolean;
  error: string | null;
  isUploading: boolean;
  uploadProgress: number;
}

export interface ModelActions {
  loadFiles: () => Promise<void>;
  selectFile: (file: ModelFile) => Promise<void>;
  uploadFile: (file: File, onProgress: (percent: number) => void) => Promise<void>;
  clearError: () => void;
}

export type UseModelHook = [ModelState, ModelActions];

// ============================================================================
// Хук
// ============================================================================

/**
 * Центральный хук управления моделями.
 * Обрабатывает загрузку файлов, выбор моделей, анализ Teacher.
 */
export function useModelManager(
  isServerAvailable: boolean,
  onTeacherAnalysisChange?: (analysis: any | null) => void
): UseModelHook {
  // --- State ---
  const [state, setState] = useState<ModelState>({
    teacherFiles: [],
    studentFiles: [],
    selectedFile: null,
    teacherAnalysis: null,
    loading: false,
    error: null,
    isUploading: false,
    uploadProgress: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Загрузка файлов ---
  const loadFiles = useCallback(async () => {
    try {
      const { teacherFiles, studentFiles } = await loadModelFiles(
        isServerAvailable,
        onTeacherAnalysisChange
      );
      setState(prev => ({
        ...prev,
        teacherFiles,
        studentFiles,
        error: null,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({ ...prev, error: msg }));
    }
  }, [isServerAvailable, onTeacherAnalysisChange]);

  // Загружаем при монтировании
  useEffect(() => {
    if (isServerAvailable) {
      loadFiles();
    }
  }, [isServerAvailable, loadFiles]);

  // --- Выбор файла ---
  const selectFile = useCallback(
    async (file: ModelFile) => {
      setState(prev => ({ ...prev, selectedFile: file, teacherAnalysis: null }));

      const isTeacher = file.path.includes('/teacher/') || file.path.includes('\\teacher\\');
      
      if (!isTeacher) {
        onTeacherAnalysisChange?.(null);
        return;
      }

      // Анализ Teacher модели
      await analyzeTeacherFile(file.filename, (analysis: any) => {
        setState(prev => ({ ...prev, teacherAnalysis: analysis }));
        onTeacherAnalysisChange?.(analysis);
      });
    },
    [onTeacherAnalysisChange]
  );

  // --- Загрузка файла ---
  const uploadFile = useCallback(
    async (file: File, onProgress: (percent: number) => void) => {
      setState(prev => ({ ...prev, isUploading: true, uploadProgress: 0, error: null }));

      try {
        await uploadModelFile(file, onProgress, loadFiles);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setState(prev => ({ ...prev, error: msg, isUploading: false }));
      }
    },
    [loadFiles]
  );

  // --- Очистка ошибок ---
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return [
    state,
    {
      loadFiles,
      selectFile,
      uploadFile,
      clearError,
    },
  ];
}
