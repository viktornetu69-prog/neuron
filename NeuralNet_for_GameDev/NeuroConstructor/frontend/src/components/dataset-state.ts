/**
 * dataset-state.ts
 * 
 * Хук управления состоянием датасетов (Stage 3: Dataset Processing Pipeline)
 * Централизует все состояния: файлы, загрузка, ошибки, анализ
 */

import { useState, useEffect, useCallback } from 'react';
import {
  DatasetFile,
  DatasetState,
  DatasetActions,
  DatasetAnalysisResult,
  UseDatasetHook,
} from '@/types/dataset-panel.types';
import {
  listDatasets,
  uploadDatasetFile,
  analyzeDataset,
  getDatasetPreview,
} from './dataset-api';

// ============================================================================
// Хук
// ============================================================================

/**
 * Центральный хук управления датасетами.
 * Обрабатывает загрузку файлов, выбор датасетов, анализ данных.
 */
export function useDatasetManager(
  isServerAvailable: boolean,
  onDatasetAnalysisChange?: (analysis: DatasetAnalysisResult | null) => void
): UseDatasetHook {
  // --- State ---
  const [state, setState] = useState<DatasetState>({
    datasets: [],
    selectedDataset: null,
    loading: false,
    error: null,
    isUploading: false,
    uploadProgress: 0,
    analysisResult: null,
    activationResult: null,
  });

  // --- Загрузка датасетов ---
  const loadDatasets = useCallback(async () => {
    if (!isServerAvailable) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: null,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const datasets = await listDatasets();
      
      // Загрузить превью и статистику для каждого датасета
      const datasetsWithPreview = await Promise.all(
        datasets.map(async (dataset) => {
          try {
            const preview = await getDatasetPreview(dataset.path);
            return {
              ...dataset,
              preview: preview as any,
              rowCount: preview.length || dataset.rowCount,
              columnCount: preview.length > 0 ? Object.keys(preview[0]).length : dataset.columnCount,
            };
          } catch {
            return dataset;
          }
        })
      );

      setState(prev => ({
        ...prev,
        datasets: datasetsWithPreview,
        loading: false,
        error: null,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({ ...prev, loading: false, error: msg }));
    }
  }, [isServerAvailable]);

  // Загружаем при монтировании
  useEffect(() => {
    if (isServerAvailable) {
      loadDatasets();
    }
  }, [isServerAvailable, loadDatasets]);

  // --- Выбор датасета ---
  const selectDataset = useCallback(
    async (id: string) => {
      const dataset = state.datasets.find(d => d.id === id);
      if (!dataset) return;

      setState(prev => ({
        ...prev,
        selectedDataset: dataset,
        analysisResult: null,
      }));

      // Загрузить превью данных
      try {
        const preview = await getDatasetPreview(dataset.path);
        setState(prev => ({
          ...prev,
          selectedDataset: {
            ...dataset,
            preview: preview as any,
            rowCount: preview.length || dataset.rowCount,
            columnCount: preview.length > 0 ? Object.keys(preview[0]).length : dataset.columnCount,
          },
        }));
      } catch {
        // Ignore preview errors
      }
    },
    [state.datasets]
  );

  // --- Загрузка файла ---
  const uploadDataset = useCallback(
    async (file: File): Promise<DatasetFile> => {
      setState(prev => ({
        ...prev,
        isUploading: true,
        uploadProgress: 0,
        error: null,
      }));

      try {
        const response = await uploadDatasetFile(file, (percent) => {
          setState(prev => ({ ...prev, uploadProgress: percent }));
        });

        // Перезагрузить список датасетов
        await loadDatasets();

        setState(prev => ({
          ...prev,
          isUploading: false,
          uploadProgress: 0,
        }));

        // Вернуть первый новый датасет
        const newDataset = state.datasets[0] || {
          id: Date.now().toString(),
          name: file.name,
          path: file.name,
          size: file.size,
          modified: new Date().toISOString(),
          type: 'training',
          format: 'csv',
          status: 'ready',
          preview: [],
        };

        return newDataset as DatasetFile;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setState(prev => ({ ...prev, error: msg, isUploading: false }));
        throw err;
      }
    },
    [state.datasets, loadDatasets]
  );

  // --- Анализ датасета ---
  const analyzeDatasetAction = useCallback(
    async (id: string): Promise<DatasetAnalysisResult> => {
      const dataset = state.datasets.find(d => d.id === id) || state.selectedDataset;
      if (!dataset) {
        return {
          success: false,
          error: 'Dataset not found',
        };
      }

      try {
        const result = await analyzeDataset(dataset.path);
        
        if (result.success) {
          setState(prev => ({
            ...prev,
            analysisResult: result,
            selectedDataset: prev.selectedDataset
              ? {
                  ...prev.selectedDataset,
                  statistics: {
                    qualityScore: result.quality_score,
                    missingValues: 0,
                  },
                }
              : null,
          }));
          onDatasetAnalysisChange?.(result);
        }

        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        const errorResult: DatasetAnalysisResult = {
          success: false,
          error: msg,
        };
        onDatasetAnalysisChange?.(errorResult);
        return errorResult;
      }
    },
    [state.datasets, state.selectedDataset, onDatasetAnalysisChange]
  );

  // --- Очистка ошибок ---
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // --- Сброс выбора ---
  const deselectDataset = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedDataset: null,
      analysisResult: null,
    }));
  }, []);

  return [
    state,
    {
      loadDatasets,
      selectDataset,
      uploadDataset,
      analyzeDataset: analyzeDatasetAction,
      clearError,
      deselectDataset,
    },
  ];
}
