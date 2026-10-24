/**
 * ConvertDialog — диалог конвертации Teacher модели в Student
 * Обрабатывает путь сохранения и запуск процесса конвертации
 */

import React from 'react';
import { ModelFile } from '@/types';

// ============================================================================
// Типы
// ============================================================================

interface ConvertDialogProps {
  selectedFile: ModelFile;
  outputPath: string;
  loading: boolean;
  onOutputPathChange: (path: string) => void;
  onConvert: () => void;
  onCancel: () => void;
}

// ============================================================================
// Стили
// ============================================================================

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  background: '#121220',
  borderRadius: 12,
  padding: 24,
  width: 500,
  maxWidth: '90%',
  border: '1px solid #1e1e30',
};

const h3Style: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: '#e8e8e8',
  marginBottom: 16,
};

const sourceInfoStyle: React.CSSProperties = {
  padding: 12,
  background: '#0a0a0f',
  borderRadius: 8,
  marginBottom: 16,
  color: '#8888aa',
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  background: '#0a0a0f',
  border: '1px solid #1e1e30',
  borderRadius: 8,
  color: '#e8e8e8',
  fontSize: 14,
  outline: 'none',
  marginBottom: 16,
  boxSizing: 'border-box',
};

const buttonContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: '#1a1a2e',
  border: '1px solid #2a2a3e',
  borderRadius: 8,
  color: '#8888aa',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
};

// ============================================================================
// Компонент
// ============================================================================

/**
 * Диалог конвертации Teacher модели в Student.
 * Отображается как модальное окно поверх ModelsPanel.
 */
const ConvertDialog: React.FC<ConvertDialogProps> = ({
  selectedFile,
  outputPath,
  loading,
  onOutputPathChange,
  onConvert,
  onCancel,
}) => (
  <div style={overlayStyle} onClick={onCancel}>
    <div style={dialogStyle} onClick={e => e.stopPropagation()}>
      <h3 style={h3Style}>Конвертировать в Student</h3>
      
      <div style={sourceInfoStyle}>
        Источник: <span style={{ color: '#e8e8e8' }}>{selectedFile.filename}</span>
      </div>
      
      <input
        type="text"
        value={outputPath}
        onChange={e => onOutputPathChange(e.target.value)}
        placeholder="Путь сохранения (например: models/student/my_model.gguf)"
        style={inputStyle}
      />
      
      <div style={buttonContainerStyle}>
        <button
          onClick={onCancel}
          disabled={loading}
          style={cancelButtonStyle}
        >
          Отмена
        </button>
        <button
          onClick={onConvert}
          disabled={loading || !outputPath.trim()}
          style={{
            padding: '10px 20px',
            background: outputPath.trim() ? '#ff9800' : '#1e1e30',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            cursor: outputPath.trim() && !loading ? 'pointer' : 'not-allowed',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {loading ? 'Конвертация...' : 'Конвертировать'}
        </button>
      </div>
    </div>
  </div>
);

export default ConvertDialog;
