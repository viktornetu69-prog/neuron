import React, { useState, useEffect, useCallback, useRef } from 'react';
import { listTeacherFiles, listStudentFiles } from '@/api.client';
import { ModelFile } from '@/types';

// ============================================================================
// Типы
// ============================================================================

interface UseModelManagerResult {
  teacherFiles: ModelFile[];
  studentFiles: ModelFile[];
  selectedFile: ModelFile | null;
  teacherAnalysis: any | null;
  loading: boolean;
  error: string | null;
  isUploading: boolean;
  uploadProgress: number;
  selectedTeacherAnalysis: any | null;
  loadFiles: () => Promise<void>;
  selectFile: (file: ModelFile) => Promise<void>;
  uploadFile: (file: File, onProgress: (percent: number) => void) => Promise<void>;
  setSelectedFile: React.Dispatch<React.SetStateAction<ModelFile | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Хук управления состоянием модели.
 * Отвечает за загрузку файлов, выбор моделей, анализ Teacher.
 */
export function useModelManager(
  isServerAvailable: boolean,
  onTeacherAnalysisChange: ((analysis: any | null) => void) | undefined
): UseModelManagerResult {
  const [teacherFiles, setTeacherFiles] = useState<ModelFile[]>([]);
  const [studentFiles, setStudentFiles] = useState<ModelFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ModelFile | null>(null);
  const [teacherAnalysis, setTeacherAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Загрузка файлов с сервера
  const loadFiles = useCallback(async () => {
    if (!isServerAvailable) return;
    try {
      const [teacherRes, studentRes] = await Promise.all([
        listTeacherFiles(),
        listStudentFiles(),
      ]);
      setTeacherFiles(teacherRes.models || []);
      setStudentFiles(studentRes.models || []);
      setError(null);
      onTeacherAnalysisChange?.(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load files: ${msg}`);
    }
  }, [isServerAvailable, onTeacherAnalysisChange]);

  // Инициализация при загрузке компонента
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Выбор файла и анализ Teacher модели
  const selectFile = useCallback(async (file: ModelFile) => {
    setSelectedFile(file);
    setTeacherAnalysis(null);
    const isTeacher = file.path.includes('/teacher/') || file.path.includes('\\teacher\\');
    
    if (isTeacher) {
      try {
        const analysis = await analyzeTeacherModel(file.filename);
        setTeacherAnalysis(analysis);
        onTeacherAnalysisChange?.(analysis);
      } catch (err: unknown) {
        console.error('Failed to analyze model:', err);
        const errorAnalysis = { status: 'error', error: 'Не удалось проанализировать модель' };
        setTeacherAnalysis(errorAnalysis);
        onTeacherAnalysisChange?.(errorAnalysis);
      }
    } else {
      onTeacherAnalysisChange?.(null);
    }
  }, [onTeacherAnalysisChange]);

  // Загрузка файла модели
  const uploadFile = useCallback(async (
    file: File,
    onProgress: (percent: number) => void
  ) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      const response = await uploadModel(file, 'teacher', onProgress);
      if (response.status === 'success') {
        await loadFiles();
        setUploadProgress(100);
        setTimeout(() => { setUploadProgress(0); setIsUploading(false); }, 1500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to upload: ${msg}`);
      setIsUploading(false);
    }
  }, [loadFiles]);

  // Текущий анализ выбранной Teacher модели
  const selectedTeacherAnalysis: any | null = selectedFile
    ? (selectedFile.path.includes('/teacher/') || selectedFile.path.includes('\\teacher\\')
      ? teacherAnalysis
      : null)
    : null;

  return {
    teacherFiles,
    studentFiles,
    selectedFile,
    teacherAnalysis,
    loading,
    error,
    isUploading,
    uploadProgress,
    selectedTeacherAnalysis,
    loadFiles,
    selectFile,
    uploadFile,
    setSelectedFile,
    setLoading,
    setError,
  };
}

// Импорт функций из API (нужен для uploadFile, но внутри хука они должны быть доступны)
// В реальном проекте их можно вынести в отдельный utils файл
import { analyzeTeacherModel, uploadModel } from '@/api.client';
