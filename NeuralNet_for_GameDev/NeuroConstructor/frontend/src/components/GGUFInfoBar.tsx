/**
 * GGUFInfoBar — информационная панель с GGUF-специфичными деталями
 * Отображает формат, квантование и специфичные параметры GGUF
 */

import React, { memo } from 'react';

// ============================================================================
// Типы
// ============================================================================

interface ArchitectureInfo {
  model_family?: string;
  vocab_size?: number;
  hidden_size?: number;
  num_layers?: number;
  num_heads?: number;
  num_kv_heads?: number;
  head_dim?: number;
  max_position_embeddings?: number;
  rope_theta?: number;
}

interface ParameterInfo {
  estimated_total_params?: number;
  tensor_count?: number;
  file_size_gb?: number;
}

interface GGUFInfoBarProps {
  hoveredNeuron: { layerIndex: number; neuronIndex: number } | null;
  layers: Array<{
    name: string;
    description: string;
    color: string;
    neuronCount: number;
  }>;
  architecture: ArchitectureInfo;
  parameters: ParameterInfo;
}

// ============================================================================
// Утилиты
// ============================================================================

/**
 * Определяет тип слоя по индексу
 */
function getLayerType(
  layerIndex: number,
  totalLayers: number,
  modelFamily?: string
): string {
  const isLLaMA = modelFamily === 'llama' || modelFamily === 'qwen';
  const isBERT = modelFamily === 'bert';
  const isGPT = modelFamily === 'gpt2';

  if (isLLaMA || isGPT) {
    if (layerIndex === 0) return 'input';
    if (layerIndex === 1) return 'embedding';
    if (layerIndex === totalLayers - 1) return 'output';
    return 'transformer';
  }

  if (isBERT) {
    if (layerIndex <= 2) return 'embedding';
    if (layerIndex === totalLayers - 1) return 'output';
    return 'transformer';
  }

  if (layerIndex === 0) return 'input';
  if (layerIndex === totalLayers - 1) return 'output';
  return 'transformer';
}

/**
 * Форматирует размер квантования GGUF
 */
function formatGGUFQuantization(headDim?: number, numLayers?: number): string {
  if (!headDim || !numLayers) return 'N/A';
  // Определяем примерный размер на основе параметров
  const totalParams = headDim * numLayers * 12;
  if (totalParams < 1_000_000) return 'Q4_0 (4-bit)';
  if (totalParams < 10_000_000) return 'Q4_K_M (4-bit mixed)';
  return 'Q5_K_M (5-bit mixed)';
}

// ============================================================================
// Основной компонент
// ============================================================================

/**
 * GGUFInfoBar — отображает GGUF-специфичную информацию о слое
 */
const GGUFInfoBar: React.FC<GGUFInfoBarProps> = memo(({
  hoveredNeuron,
  layers,
  architecture,
  parameters,
}) => {
  if (!hoveredNeuron || !layers[hoveredNeuron.layerIndex]) return null;

  const layer = layers[hoveredNeuron.layerIndex];
  const layerType = getLayerType(
    hoveredNeuron.layerIndex,
    layers.length,
    architecture.model_family
  );

  // GGUF-специфичная информация
  const ggufInfo = (() => {
    switch (layerType) {
      case 'input':
        return {
          title: '🔤 Input Layer — Tokenizer',
          details: [
            `Модель: ${(architecture.model_family || 'unknown').toUpperCase()}`,
            `Вход: текст → токены`,
            `Словарь: ${architecture.vocab_size?.toLocaleString() || 'N/A'} токенов`,
          ],
          gguf: 'Format: GGUF v3',
        };

      case 'embedding':
        return {
          title: '📊 Embedding Layer — Weight Matrices',
          details: [
            `Wte: ${architecture.vocab_size?.toLocaleString()} × ${architecture.hidden_size?.toLocaleString()}`,
            `Wpe: ${architecture.max_position_embeddings?.toLocaleString()} × ${architecture.hidden_size?.toLocaleString()}`,
            `Тип: float16 → квантование`,
          ],
          gguf: `Quant: ${formatGGUFQuantization(architecture.head_dim, architecture.num_layers)}`,
        };

      case 'transformer':
        return {
          title: '🧠 Transformer Block — MHA + FFN',
          details: [
            `Attention: ${architecture.num_heads} heads × ${architecture.head_dim || 'N/A'} dim`,
            `KV Heads: ${architecture.num_kv_heads || architecture.num_heads}`,
            `FFN: hidden × 4 expansion`,
            `RoPE θ: ${architecture.rope_theta?.toLocaleString() || 'N/A'}`,
          ],
          gguf: `Layers: ${architecture.num_layers} blocks`,
        };

      case 'output':
        return {
          title: '🎯 Output Layer — LM Head',
          details: [
            `Projection: ${architecture.hidden_size?.toLocaleString()} → ${architecture.vocab_size?.toLocaleString()}`,
            `Output: probability distribution`,
            `Softmax over vocabulary`,
          ],
          gguf: 'Format: weight_matrix',
        };

      default:
        return {
          title: layer.name,
          details: [`Нейронов: ${layer.neuronCount}`],
          gguf: '',
        };
    }
  })();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        padding: '10px 20px',
        borderTop: '1px solid #1a1a2e',
        background: '#0f0f1a',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
      }}
    >
      {/* Цветной индикатор */}
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: layer.color,
          flexShrink: 0,
          boxShadow: `0 0 8px ${layer.color}`,
        }}
        aria-hidden="true"
      />

      {/* Основная информация */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#e8e8e8', marginBottom: 2 }}>
          {ggufInfo.title}
        </div>
        <div style={{ fontSize: 10, color: '#8888aa', lineHeight: 1.4 }}>
          {ggufInfo.details.map((detail, i) => (
            <div key={i}>{detail}</div>
          ))}
        </div>
      </div>

      {/* GGUF формат */}
      {ggufInfo.gguf && (
        <div
          style={{
            padding: '4px 10px',
            background: '#1a1a2e',
            border: '1px solid #2a2a3e',
            borderRadius: 4,
            fontSize: 9,
            color: '#7c6ff7',
            whiteSpace: 'nowrap',
            fontWeight: 600,
          }}
        >
          {ggufInfo.gguf}
        </div>
      )}
    </div>
  );
});

GGUFInfoBar.displayName = 'GGUFInfoBar';

export default GGUFInfoBar;
