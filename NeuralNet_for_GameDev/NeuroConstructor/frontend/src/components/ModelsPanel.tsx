/**
 * ModelsPanel — главная панель работы с моделями
 * Управляет загрузкой, анализом и конвертацией Teacher/Student моделей
 * 
 * Структура:
 * - Header: кнопки действий (загрузка, создание Student, конвертация)
 * - Left sidebar: ModelListPanel (список файлов)
 * - Right panel: детали выбранной модели
 * - Диалоги: ConvertDialog, StudentCreateDialog
 */

import React, { useState, useRef } from 'react';
import { ModelFile } from '@/types';
import ModelListPanel from './ModelListPanel';
import ConvertDialog from './ConvertDialog';
import StudentCreateDialog from './StudentCreateDialog';
import { StudentArchitecture } from './StudentCreateDialog';
import { useModelManager } from './model-state';
import { formatParams, formatDate, formatSize } from './files-manager';
import { convertTeacherToStudent, createStudentFromScratchAPI } from './files-manager';

// ============================================================================
// Константы
// ============================================================================

const DEFAULT_STUDENT_ARCH: StudentArchitecture = {
  model_family: 'qwen3',
  hidden_size: 768,
  num_layers: 12,
  num_heads: 12,
  num_kv_heads: 12,
  vocab_size: 32000,
  max_position_embeddings: 2048,
  rope_theta: 10000,
  head_dim: 64,
};

// ============================================================================
// Компоненты
// ============================================================================

/**
 * Главная панель работы с моделями.
 */
export function ModelsPanel({
  isServerAvailable,
  onTeacherAnalysisChange,
}: {
  isServerAvailable: boolean;
  onTeacherAnalysisChange?: (analysis: any | null) => void;
}) {
  // --- State ---
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showCreateStudentDialog, setShowCreateStudentDialog] = useState(false);
  const [outputPath, setOutputPath] = useState('models/student/');
  const [studentArch, setStudentArch] = useState<StudentArchitecture>(DEFAULT_STUDENT_ARCH);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Хук управления моделями ---
  const [modelState, modelActions] = useModelManager(isServerAvailable, onTeacherAnalysisChange);
  const {
    teacherFiles,
    studentFiles,
    selectedFile,
    teacherAnalysis,
    loading,
    error,
    isUploading,
    uploadProgress,
  } = modelState;

  const { loadFiles, selectFile, uploadFile, clearError } = modelActions;

  // --- Обработчики ---

  // Обработка выбора файла из формы Student
  const handleStudentArchChange = (arch: StudentArchitecture) => {
    setStudentArch(arch);
  };

  // Обработка выбора файла из списка
  const handleFileSelect = async (file: ModelFile) => {
    await selectFile(file);
  };

  // Обработка загрузки файла
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadFile(file, (percent: number) => {
      // Прогресс обрабатывается внутри uploadFile
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Обработка конвертации
  const handleConvert = async () => {
    if (!selectedFile) return;

    const result = await convertTeacherToStudent(
      selectedFile,
      outputPath,
      undefined, // loading
      loadFiles,
      setOutputPath
    );

    if (!result.success) {
      clearError();
    }
  };

  // Обработка создания Student
  const handleCreateStudent = async () => {
    const result = await createStudentFromScratchAPI(
      studentArch as unknown as Record<string, unknown>,
      undefined, // loading
      loadFiles,
      setShowCreateStudentDialog
    );

    if (!result.success) {
      clearError();
    }
  };

  // Открытие file picker
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  // --- Данные для отображения архитектуры ---
  const fieldDescriptions: Record<string, string> = {
    'Архитектура': 'Тип нейросети (BERT, LLaMA, Qwen3 и др.). Определяет общую структуру и механизм обработки данных.',
    'Размер словаря': 'Количество уникальных токенов (слов и подслов), которые модель может распознать.',
    'Размерность (Hidden)': 'Размерность скрытого представления каждого токена. Влияет на количество параметров.',
    'Слои': 'Количество слоёв трансформера. Больше слоёв = лучше качество, но выше затраты.',
    'Головки внимания': 'Количество head-ов в Multi-Head Attention.',
    'KV головки': 'Количество head-ов для key-value пар (GQA).',
    'Размер головки': 'Размерность каждого attention head.',
    'Макс. контекст': 'Максимальная длина последовательности токенов.',
    'RoPE Theta': 'Базовая частота в Rope Positional Embeddings.',
    'Оценка параметров': 'Общее количество обучаемых параметров модели.',
  };

  const archFields = teacherAnalysis?.architecture ? [
    { label: 'Архитектура', value: teacherAnalysis.architecture.model_family?.toUpperCase() },
    { label: 'Размер словаря', value: teacherAnalysis.architecture.vocab_size?.toLocaleString() || 'N/A' },
    { label: 'Размерность (Hidden)', value: teacherAnalysis.architecture.hidden_size?.toLocaleString() || 'N/A' },
    { label: 'Слои', value: teacherAnalysis.architecture.num_layers?.toString() || 'N/A' },
    { label: 'Головки внимания', value: teacherAnalysis.architecture.num_heads?.toString() || 'N/A' },
    { label: 'KV головки', value: teacherAnalysis.architecture.num_kv_heads?.toString() || 'N/A' },
    { label: 'Размер головки', value: teacherAnalysis.architecture.head_dim?.toString() || 'N/A' },
    { label: 'Макс. контекст', value: teacherAnalysis.architecture.max_position_embeddings?.toString() || 'N/A' },
    { label: 'RoPE Theta', value: teacherAnalysis.architecture.rope_theta?.toString() || 'N/A' },
    { label: 'Оценка параметров', value: teacherAnalysis.parameters?.estimated_total_params ? formatParams(teacherAnalysis.parameters.estimated_total_params) : 'N/A' },
  ] : [];

  // --- Определение типа файла ---
  const isTeacherFile = selectedFile
    ? selectedFile.path.includes('/teacher/') || selectedFile.path.includes('\\teacher\\')
    : false;

  // --- Стили ---
  const containerStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#0a0a0f',
  };

  const headerContainerStyle: React.CSSProperties = {
    padding: '16px 24px',
    borderBottom: '1px solid #1e1e30',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'column',
    gap: 12,
  };

  const buttonsContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    width: '100%',
  };

  const buttonBaseStyle: React.CSSProperties = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 6,
    color: 'white',
    fontSize: 13,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    cursor: 'pointer',
  };

  const mainContentStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  };

  const rightPanelStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: 24,
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 24,
  };

  const cardStyle: React.CSSProperties = {
    padding: 12,
    background: '#121220',
    borderRadius: 8,
    border: '1px solid #1e1e30',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#8888aa',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: '#e8e8e8',
  };

  const actionButtonsStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
  };

  const actionButtonStyle: React.CSSProperties = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div style={containerStyle}>
      {/* ===== Header ===== */}
      <div style={headerContainerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#e8e8e8' }}>
            🧠 Модели
          </h2>
          <p style={{ fontSize: 12, color: '#8888aa', margin: 0 }}>
            {teacherFiles.length + studentFiles.length} моделей
          </p>
        </div>

        <div style={buttonsContainerStyle}>
          <button
            onClick={openFilePicker}
            disabled={!isServerAvailable || loading}
            style={{
              ...buttonBaseStyle,
              background: isServerAvailable ? '#7c6ff7' : '#1e1e30',
              cursor: isServerAvailable ? 'pointer' : 'not-allowed',
            }}
          >
            <span>📁</span> Выбрать модель
          </button>
          <button
            onClick={() => setShowCreateStudentDialog(true)}
            disabled={!isServerAvailable || loading}
            style={{
              ...buttonBaseStyle,
              background: isServerAvailable ? '#4caf50' : '#1e1e30',
              cursor: isServerAvailable ? 'pointer' : 'not-allowed',
            }}
          >
            <span>+</span> Новый Student
          </button>
          <button
            onClick={() => setShowConvertDialog(true)}
            disabled={!selectedFile || !isServerAvailable || loading}
            style={{
              ...buttonBaseStyle,
              background: selectedFile && isServerAvailable ? '#ff9800' : '#1e1e30',
              cursor: selectedFile && isServerAvailable ? 'pointer' : 'not-allowed',
            }}
          >
            ⟳ Конвертировать
          </button>
        </div>

        {/* Прогресс загрузки */}
        {isUploading && (
          <div style={{ width: '100%', padding: '12px 0', background: '#121220', borderRadius: 8, border: '1px solid #2a2a3e' }}>
            <div style={{ width: '100%', height: 12, background: '#0a0a0f', borderRadius: 6, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #7c6ff7, #9d8fff)',
                borderRadius: 6,
                transition: 'width 0.2s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#8888aa' }}>
              <span>Загрузка модели...</span>
              <span style={{ fontWeight: 600, color: '#7c6ff7' }}>{uploadProgress}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Скрытый input для загрузки файла */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".gguf,.pt,.pth,.ckpt,.safetensors"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Ошибки */}
      {error && (
        <div style={{
          padding: '12px 24px',
          background: 'rgba(244, 67, 54, 0.1)',
          borderLeft: '3px solid #f44336',
          margin: '16px 24px',
          borderRadius: '0 6px 6px 0',
          color: '#f44336',
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* ===== Main Content ===== */}
      <div style={mainContentStyle}>
        {/* Left sidebar: Model List */}
        <ModelListPanel
          teacherFiles={teacherFiles}
          studentFiles={studentFiles}
          selectedFile={selectedFile}
          onSelectFile={handleFileSelect}
        />

        {/* Right panel: Details */}
        <div style={rightPanelStyle}>
          {!selectedFile ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#8888aa',
            }}>
              <p style={{ fontSize: 14 }}>Выберите модель</p>
            </div>
          ) : isTeacherFile && teacherAnalysis?.status === 'success' ? (
            // Teacher analysis success
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e8e8e8', marginBottom: 16 }}>
                📦 {teacherAnalysis.filename}
              </h2>
              <div style={gridStyle}>
                {archFields.map((field, index) => (
                  <div key={index} style={cardStyle} title={fieldDescriptions[field.label] || ''}>
                    <div style={labelStyle}>{field.label}</div>
                    <div style={valueStyle}>{field.value}</div>
                  </div>
                ))}
              </div>
              <div style={actionButtonsStyle}>
                <button
                  onClick={() => setShowConvertDialog(true)}
                  disabled={!isServerAvailable || loading}
                  style={{
                    ...actionButtonStyle,
                    background: isServerAvailable ? '#ff9800' : '#1e1e30',
                    cursor: isServerAvailable ? 'pointer' : 'not-allowed',
                  }}
                >
                  ⟳ Конвертировать в Student
                </button>
                <button
                  onClick={loadFiles}
                  disabled={loading}
                  style={{
                    ...actionButtonStyle,
                    background: '#1a1a2e',
                    border: '1px solid #2a2a3e',
                    color: '#8888aa',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  ↻ Обновить
                </button>
              </div>
            </div>
          ) : isTeacherFile ? (
            // Teacher analysis error
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#8888aa',
            }}>
              <p style={{ fontSize: 14, marginBottom: 8 }}>📦 {selectedFile.filename}</p>
              <p style={{ fontSize: 13, color: '#f44336' }}>
                {teacherAnalysis?.error || 'Анализ не доступен'}
              </p>
              <p style={{ fontSize: 12, color: '#666688', marginTop: 8 }}>
                Размер: {formatSize(selectedFile.size)} • Изменён: {formatDate(selectedFile.modified)}
              </p>
            </div>
          ) : (
            // Student file
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e8e8e8', marginBottom: 16 }}>
                🎓 {selectedFile.filename}
              </h2>
              <div style={gridStyle}>
                <div style={cardStyle}>
                  <div style={labelStyle}>Размер</div>
                  <div style={valueStyle}>{formatSize(selectedFile.size)}</div>
                </div>
                <div style={cardStyle}>
                  <div style={labelStyle}>Изменён</div>
                  <div style={valueStyle}>{formatDate(selectedFile.modified)}</div>
                </div>
              </div>
              <div style={actionButtonsStyle}>
                <button
                  onClick={loadFiles}
                  disabled={loading}
                  style={{
                    ...actionButtonStyle,
                    background: '#1a1a2e',
                    border: '1px solid #2a2a3e',
                    color: '#8888aa',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  ↻ Обновить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Диалоги ===== */}
      {showConvertDialog && selectedFile && (
        <ConvertDialog
          selectedFile={selectedFile}
          outputPath={outputPath}
          loading={loading}
          onOutputPathChange={setOutputPath}
          onConvert={handleConvert}
          onCancel={() => setShowConvertDialog(false)}
        />
      )}

      {showCreateStudentDialog && (
        <StudentCreateDialog
          studentArch={studentArch}
          teacherArch={teacherAnalysis?.architecture}
          loading={loading}
          onArchChange={handleStudentArchChange}
          onCreate={handleCreateStudent}
          onCancel={() => setShowCreateStudentDialog(false)}
        />
      )}
    </div>
  );
}
