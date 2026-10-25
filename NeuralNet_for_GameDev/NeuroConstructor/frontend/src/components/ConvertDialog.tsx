/**
 * ConvertDialog — диалог конвертации Teacher модели в Student
 * Обрабатывает путь сохранения, параметры конвертации и запуск процесса
 */

import React, { useState } from 'react';
import { ModelFile } from '@/types';

// ============================================================================
// Типы
// ============================================================================

interface ConvertDialogProps {
  selectedFile: ModelFile;
  outputPath: string;
  loading: boolean;
  onOutputPathChange: (path: string) => void;
  onConvert: (config: StudentConversionConfig) => void;
  onCancel: () => void;
  convertProgress?: { progress: number; stage: string } | null;
}

export interface StudentConversionConfig {
  hidden_size_ratio: number;
  num_layers_ratio: number;
  num_heads_ratio: number;
  target_compression_ratio: number;
  quantization: string;
  max_seq_length: number;
  kv_heads_ratio: number;
  head_dim: number;
  preserve_embeddings: boolean;
  share_embeddings: boolean;
  rope_theta: number;
  activation_function: string;
}

const DEFAULT_CONVERSION_CONFIG: StudentConversionConfig = {
  hidden_size_ratio: 0.5,
  num_layers_ratio: 0.4,
  num_heads_ratio: 0.5,
  target_compression_ratio: 0.1,
  quantization: 'Q4_0',
  max_seq_length: 512,
  kv_heads_ratio: 0.5,
  head_dim: 128,
  preserve_embeddings: true,
  share_embeddings: false,
  rope_theta: 10000,
  activation_function: 'silu',
};

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
  width: 700,
  maxWidth: '95%',
  maxHeight: '90vh',
  overflow: 'auto',
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
  marginTop: 16,
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

const progressContainerStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: '12px 0',
};

const progressBarBgStyle: React.CSSProperties = {
  width: '100%',
  height: 12,
  background: '#0a0a0f',
  borderRadius: 6,
  overflow: 'hidden',
  marginBottom: 6,
};

const progressLabelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 13,
  color: '#8888aa',
};

// Стили для секции параметров
const sectionStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: 16,
  background: '#0f0f1a',
  borderRadius: 10,
  border: '1px solid #1e1e30',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#e8e8e8',
  marginBottom: 14,
  paddingBottom: 8,
  borderBottom: '1px solid #1e1e30',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const paramRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 12,
};

const paramLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: '#e8e8e8',
  minWidth: 140,
};

const paramDescriptionStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#8888aa',
  marginTop: 2,
};

const paramInputStyle: React.CSSProperties = {
  width: 80,
  padding: '6px 10px',
  background: '#121220',
  border: '1px solid #1e1e30',
  borderRadius: 6,
  color: '#e8e8e8',
  fontSize: 12,
  textAlign: 'center',
};

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: '#121220',
  border: '1px solid #1e1e30',
  borderRadius: 6,
  color: '#e8e8e8',
  fontSize: 12,
};

const rangeSliderStyle: React.CSSProperties = {
  flex: 1,
  height: 6,
  borderRadius: 3,
  appearance: 'none',
  background: '#1e1e30',
  outline: 'none',
  cursor: 'pointer',
};

const toggleButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  background: active ? '#7c6ff7' : '#1e1e30',
  border: `1px solid ${active ? '#7c6ff7' : '#2a2a3e'}`,
  borderRadius: 6,
  color: 'white',
  fontSize: 11,
  cursor: 'pointer',
  fontWeight: 600,
});

// ============================================================================
// Компонент
// ============================================================================

/**
 * Диалог конвертации Teacher модели в Student с параметрами.
 * Отображается как модальное окно поверх ModelsPanel.
 */
const ConvertDialog: React.FC<ConvertDialogProps> = ({
  selectedFile,
  outputPath,
  loading,
  onOutputPathChange,
  onConvert,
  onCancel,
  convertProgress,
}) => {
  const [config, setConfig] = useState<StudentConversionConfig>(DEFAULT_CONVERSION_CONFIG);

  const isComplete = convertProgress?.progress === 100;
  const isFailed = convertProgress?.progress === -1;

  const updateConfig = (key: keyof StudentConversionConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleConvertClick = () => {
    onConvert(config);
  };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={dialogStyle} onClick={e => e.stopPropagation()}>
        <h3 style={h3Style}>
          🔄 Конвертация Teacher → Student
        </h3>

        <div style={sourceInfoStyle}>
          📦 Источник: <span style={{ color: '#e8e8e8' }}>{selectedFile.filename}</span>
        </div>

        {/* Путь сохранения */}
        <input
          type="text"
          value={outputPath}
          onChange={e => onOutputPathChange(e.target.value)}
          placeholder="Путь сохранения (например: student/my_model.gguf)"
          style={{ ...inputStyle, opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}
        />

        {/* Параметры конвертации */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>📐 Параметры архитектуры</div>

          {/* Hidden Size Ratio */}
          <div style={paramRowStyle}>
            <div>
              <div style={paramLabelStyle}>Hidden Size</div>
              <div style={paramDescriptionStyle}>Размер скрытого представления (512-4096)</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input
                type="range"
                min="10"
                max="100"
                value={Math.round(config.hidden_size_ratio * 100)}
                onChange={e => updateConfig('hidden_size_ratio', parseInt(e.target.value) / 100)}
                style={rangeSliderStyle}
                disabled={loading}
              />
              <span style={{ fontSize: 12, color: '#e8e8e8', minWidth: 30, textAlign: 'right' }}>
                {(config.hidden_size_ratio * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Num Layers Ratio */}
          <div style={paramRowStyle}>
            <div>
              <div style={paramLabelStyle}>Слои (Layers)</div>
              <div style={paramDescriptionStyle}>Количество слоёв трансформера</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input
                type="range"
                min="10"
                max="100"
                value={Math.round(config.num_layers_ratio * 100)}
                onChange={e => updateConfig('num_layers_ratio', parseInt(e.target.value) / 100)}
                style={rangeSliderStyle}
                disabled={loading}
              />
              <span style={{ fontSize: 12, color: '#e8e8e8', minWidth: 30, textAlign: 'right' }}>
                {(config.num_layers_ratio * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Num Heads Ratio */}
          <div style={paramRowStyle}>
            <div>
              <div style={paramLabelStyle}>Головки (Heads)</div>
              <div style={paramDescriptionStyle}>Количество attention head</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input
                type="range"
                min="10"
                max="100"
                value={Math.round(config.num_heads_ratio * 100)}
                onChange={e => updateConfig('num_heads_ratio', parseInt(e.target.value) / 100)}
                style={rangeSliderStyle}
                disabled={loading}
              />
              <span style={{ fontSize: 12, color: '#e8e8e8', minWidth: 30, textAlign: 'right' }}>
                {(config.num_heads_ratio * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* KV Heads Ratio */}
          <div style={paramRowStyle}>
            <div>
              <div style={paramLabelStyle}>KV Heads (GQA)</div>
              <div style={paramDescriptionStyle}>Количество KV head для группировки</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input
                type="range"
                min="10"
                max="100"
                value={Math.round(config.kv_heads_ratio * 100)}
                onChange={e => updateConfig('kv_heads_ratio', parseInt(e.target.value) / 100)}
                style={rangeSliderStyle}
                disabled={loading}
              />
              <span style={{ fontSize: 12, color: '#e8e8e8', minWidth: 30, textAlign: 'right' }}>
                {(config.kv_heads_ratio * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>⚡ Квантизация и сжатие</div>

          {/* Quantization */}
          <div style={paramRowStyle}>
            <div>
              <div style={paramLabelStyle}>Квантизация</div>
              <div style={paramDescriptionStyle}>Метод квантования весов</div>
            </div>
            <select
              value={config.quantization}
              onChange={e => updateConfig('quantization', e.target.value)}
              style={{ ...selectStyle, flex: 1 }}
              disabled={loading}
            >
              <option value="Q4_0">Q4_0 — 4-бит (баланс)</option>
              <option value="Q5_0">Q5_0 — 5-бит (лучше)</option>
              <option value="Q6_0">Q6_0 — 6-бит (отлично)</option>
              <option value="Q8_0">Q8_0 — 8-бит (макс. качество)</option>
            </select>
          </div>

          {/* Target Compression */}
          <div style={paramRowStyle}>
            <div>
              <div style={paramLabelStyle}>Целевое сжатие</div>
              <div style={paramDescriptionStyle}>Коэффициент сжатия модели</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input
                type="range"
                min="1"
                max="50"
                value={Math.round(config.target_compression_ratio * 100)}
                onChange={e => updateConfig('target_compression_ratio', parseInt(e.target.value) / 100)}
                style={rangeSliderStyle}
                disabled={loading}
              />
              <span style={{ fontSize: 12, color: '#e8e8e8', minWidth: 40, textAlign: 'right' }}>
                {(config.target_compression_ratio * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Max Seq Length */}
          <div style={paramRowStyle}>
            <div>
              <div style={paramLabelStyle}>Max Seq Length</div>
              <div style={paramDescriptionStyle}>Максимальная длина последовательности</div>
            </div>
            <input
              type="number"
              value={config.max_seq_length}
              onChange={e => updateConfig('max_seq_length', Math.max(64, parseInt(e.target.value) || 512))}
              style={paramInputStyle}
              disabled={loading}
            />
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>🔧 Дополнительные параметры</div>

          {/* Preserve Embeddings */}
          <div style={paramRowStyle}>
            <div>
              <div style={paramLabelStyle}>Сохранять embedding</div>
              <div style={paramDescriptionStyle}>Не квантовать слой embedding</div>
            </div>
            <button
              onClick={() => updateConfig('preserve_embeddings', !config.preserve_embeddings)}
              style={toggleButtonStyle(config.preserve_embeddings)}
              disabled={loading}
            >
              {config.preserve_embeddings ? '✅ Да' : '❌ Нет'}
            </button>
          </div>

          {/* Share Embeddings */}
          <div style={paramRowStyle}>
            <div>
              <div style={paramLabelStyle}>Share Embeddings</div>
              <div style={paramDescriptionStyle}>Разделять input/output embedding</div>
            </div>
            <button
              onClick={() => updateConfig('share_embeddings', !config.share_embeddings)}
              style={toggleButtonStyle(config.share_embeddings)}
              disabled={loading}
            >
              {config.share_embeddings ? '✅ Да' : '❌ Нет'}
            </button>
          </div>

          {/* Rope Theta */}
          <div style={paramRowStyle}>
            <div>
              <div style={paramLabelStyle}>RoPE Theta</div>
              <div style={paramDescriptionStyle}>Базовая частота для позиционного кодирования</div>
            </div>
            <input
              type="number"
              value={config.rope_theta}
              onChange={e => updateConfig('rope_theta', parseInt(e.target.value) || 10000)}
              style={paramInputStyle}
              disabled={loading}
            />
          </div>
        </div>

        {/* Прогресс-бар конвертации */}
        {convertProgress && (
          <div style={progressContainerStyle}>
            <div style={progressBarBgStyle}>
              <div style={{
                width: `${Math.max(0, Math.min(100, convertProgress.progress))}%`,
                height: '100%',
                background: isFailed
                  ? '#f44336'
                  : isComplete
                    ? '#4caf50'
                    : 'linear-gradient(90deg, #ff9800, #ffb74d)',
                borderRadius: 6,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={progressLabelStyle}>
              <span>{convertProgress.stage}</span>
              <span style={{ fontWeight: 600, color: isFailed ? '#f44336' : isComplete ? '#4caf50' : '#ff9800' }}>
                {Math.max(0, Math.min(100, convertProgress.progress))}%
              </span>
            </div>
          </div>
        )}

        <div style={buttonContainerStyle}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={cancelButtonStyle}
          >
            {isComplete || isFailed ? 'Закрыть' : 'Отмена'}
          </button>
          <button
            onClick={handleConvertClick}
            disabled={loading || !outputPath.trim() || isComplete || isFailed}
            style={{
              padding: '10px 20px',
              background: (outputPath.trim() && !loading && !isComplete && !isFailed)
                ? '#ff9800'
                : '#1e1e30',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: (outputPath.trim() && !loading && !isComplete && !isFailed)
                ? 'pointer'
                : 'not-allowed',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {loading
              ? 'Конвертация...'
              : isComplete
                ? 'Готово!'
                : isFailed
                  ? 'Ошибка'
                  : 'Конвертировать'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConvertDialog;
