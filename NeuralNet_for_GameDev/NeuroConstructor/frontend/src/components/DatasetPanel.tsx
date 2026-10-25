/**
 * DatasetPanel — главная панель работы с датасетами
 * 
 * Управляет загрузкой, предварительным просмотром и анализом данных
 * для Stage 3: Dataset Processing Pipeline
 * 
 * Архитектура:
 * - Header: кнопки действий (загрузка, анализ, настройки)
 * - Left sidebar: DatasetListPanel (список датасетов)
 * - Right panel: DatasetDetailsPanel (детали выбранного датасета)
 */

import React, { useState, useRef, useCallback } from 'react';
import { DatasetAnalysisResult } from '@/types/dataset-panel.types';
import { useDatasetManager } from './dataset-state';
import { DatasetListPanel } from './DatasetListPanel';
import { DatasetDetailsPanel } from './DatasetDetailsPanel';
import { DatasetViewer } from './DatasetViewer';

interface DatasetPanelProps {
  isServerAvailable: boolean;
  onDatasetAnalysisChange?: (analysis: DatasetAnalysisResult | null) => void;
}

export const DatasetPanel: React.FC<DatasetPanelProps> = ({
  isServerAvailable,
  onDatasetAnalysisChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Хук управления датасетами ---
  const [datasetState, datasetActions] = useDatasetManager(
    isServerAvailable,
    onDatasetAnalysisChange
  );

  const {
    datasets,
    selectedDataset,
    loading,
    error,
    isUploading,
    uploadProgress,
  } = datasetState;

  const [showViewer, setShowViewer] = useState(false);

  const {
    loadDatasets,
    selectDataset,
    uploadDataset,
    analyzeDataset,
    clearError,
    deselectDataset,
  } = datasetActions;

  // --- Обработчики ---

  const handleDatasetSelect = useCallback(async (dataset: any) => {
    await selectDataset(dataset.id);
  }, [selectDataset]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadDataset(file);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  }, [uploadDataset]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedDataset) return;
    try {
      await analyzeDataset(selectedDataset.id);
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  }, [selectedDataset, analyzeDataset]);

  const handleRefresh = useCallback(() => {
    loadDatasets();
  }, [loadDatasets]);

  const handleViewData = useCallback(() => {
    if (!selectedDataset) return;
    setShowViewer(true);
  }, [selectedDataset]);

  const handleCloseViewer = useCallback(() => {
    setShowViewer(false);
  }, []);

  return (
    <div style={styles.container}>
      {/* Header Bar */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>
            📊 Панель датасетов
          </h1>
          <span style={styles.subtitle}>
            Stage 3: Dataset Processing Pipeline
          </span>
        </div>

        <div style={styles.headerActions}>
          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={!isServerAvailable}
            style={{
              ...styles.actionButton,
              background: isServerAvailable ? '#1a1a2e' : '#0a0a0f',
            }}
            title="Обновить список"
          >
            ⟳ Обновить
          </button>

          {/* Analyze */}
          <button
            onClick={handleAnalyze}
            disabled={!selectedDataset || !isServerAvailable || loading}
            style={{
              ...styles.actionButton,
              background: (selectedDataset && isServerAvailable) ? '#7c6ff7' : '#1a1a2e',
              color: (selectedDataset && isServerAvailable) ? 'white' : '#666688',
              cursor: (selectedDataset && isServerAvailable) ? 'pointer' : 'not-allowed',
            }}
            title={selectedDataset ? 'Проанализировать датасет' : 'Выберите датасет'}
          >
            🔍 Анализ
          </button>

          {/* View Data */}
          <button
            onClick={handleViewData}
            disabled={!selectedDataset || !isServerAvailable || loading}
            style={{
              ...styles.actionButton,
              background: (selectedDataset && isServerAvailable) ? '#1a7c6f' : '#1a1a2e',
              color: (selectedDataset && isServerAvailable) ? 'white' : '#666688',
              cursor: (selectedDataset && isServerAvailable) ? 'pointer' : 'not-allowed',
            }}
            title={selectedDataset ? 'Просмотреть данные' : 'Выберите датасет'}
          >
            👁 Данные
          </button>

          {/* Upload */}
          <label
            style={{
              ...styles.actionButton,
              ...(!isServerAvailable && { background: '#2a2a3e', cursor: 'not-allowed' }),
            }}
            title={!isServerAvailable ? 'Сервер недоступен' : 'Загрузить датасет'}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.parquet,.tfrecord,.npy,.jsonl,.zip"
              onChange={handleFileUpload}
              disabled={!isServerAvailable}
              style={{ display: 'none' }}
            />
            📤 Загрузить
          </label>

          {/* Upload Progress */}
          {isUploading && (
            <div style={styles.uploadProgress}>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${uploadProgress}%`,
                  }}
                />
              </div>
              <span style={styles.progressText}>{uploadProgress}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {loading && datasets.length === 0 ? (
          <div style={styles.loadingOverlay}>
            <div style={styles.spinner} />
            <p style={{ color: '#8888aa', marginTop: 16 }}>
              Загрузка датасетов...
            </p>
          </div>
        ) : error && !selectedDataset ? (
          <div style={styles.errorContainer}>
            <p style={{ color: '#f44336', margin: '0 0 12px', fontSize: 14 }}>
              ⚠️ {error}
            </p>
            <button
              onClick={clearError}
              style={styles.retryButton}
            >
              Попробовать снова
            </button>
          </div>
        ) : (
          <>
            {/* Sidebar: Dataset List */}
            <div style={styles.sidebar}>
              <DatasetListPanel
                datasets={datasets}
                selectedDataset={selectedDataset}
                onSelectDataset={handleDatasetSelect}
                isServerAvailable={isServerAvailable}
                loading={loading}
              />
            </div>

            {/* Main Panel: Dataset Details or Viewer */}
            <div style={styles.mainPanel}>
              {showViewer && selectedDataset ? (
                <DatasetViewer
                  datasetId={selectedDataset.id}
                  isServerAvailable={isServerAvailable}
                  onClose={handleCloseViewer}
                />
              ) : selectedDataset ? (
                <DatasetDetailsPanel
                  dataset={selectedDataset}
                  onAnalyze={handleAnalyze}
                  isServerAvailable={isServerAvailable}
                />
              ) : (
                <div style={styles.emptyState}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
                  <h3 style={{ color: '#8888aa', margin: '0 0 8px' }}>
                    Нет выбранных датасетов
                  </h3>
                  <p style={{ color: '#666688', fontSize: 14, maxWidth: 300, textAlign: 'center' }}>
                    Загрузите датасет или выберите его из списка для просмотра деталей
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#0a0a0f',
    height: '100%',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #2a2a3e',
    background: '#0a0a0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  title: {
    color: '#e8e8e8',
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
  },
  subtitle: {
    color: '#8888aa',
    fontSize: 12,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: '8px 14px',
    background: '#1a1a2e',
    border: '1px solid #2a2a3e',
    borderRadius: 6,
    color: '#8888aa',
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  uploadProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 12px',
    background: '#1a1a2e',
    borderRadius: 6,
  },
  progressBar: {
    width: 80,
    height: 6,
    background: '#0a0a0f',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#7c6ff7',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  progressText: {
    color: '#7c6ff7',
    fontSize: 11,
    fontWeight: 600,
    minWidth: 32,
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  sidebar: {
    borderRight: '1px solid #2a2a3e',
    display: 'flex',
    flexDirection: 'column',
  },
  mainPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  loadingOverlay: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0f',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #2a2a3e',
    borderTop: '3px solid #7c6ff7',
    borderRadius: '50%',
  },
  errorContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  retryButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #666688',
    color: '#8888aa',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666688',
    padding: 40,
  },
};
