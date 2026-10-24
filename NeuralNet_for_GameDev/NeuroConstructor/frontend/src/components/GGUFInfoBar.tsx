/**
 * GGUFInfoBar — информационная панель с GGUF-специфичными деталями
 * 
 * Исправлено:
 * - Все тексты на русском
 * - Better layout чтобы текст не обрезался
 * - Clearer layer type descriptions
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

function formatNumber(num?: number): string {
  if (!num) return 'N/A';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
  return num.toString();
}

// ============================================================================
// Основной компонент
// ============================================================================

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

  // Информация в зависимости от типа слоя
  const getContent = () => {
    switch (layerType) {
      case 'input':
        return {
          icon: '📝',
          title: 'Входной слой — Токенизатор',
          details: [
            `Модель: ${(architecture.model_family || 'unknown').toUpperCase()}`,
            `Преобразование: текст → числа (токены)`,
            `Размер словаря: ${formatNumber(architecture.vocab_size)} уникальных токенов`,
          ],
          badge: 'GGUF v3',
        };

      case 'embedding':
        return {
          icon: '🔤',
          title: 'Слой встраиваний — Матрицы весов',
          details: [
            `Wte (слова): ${formatNumber(architecture.vocab_size)} × ${formatNumber(architecture.hidden_size)}`,
            `Wpe (позиции): ${formatNumber(architecture.max_position_embeddings)} × ${formatNumber(architecture.hidden_size)}`,
            `Тип данных: float16 → квантование`,
          ],
          badge: 'Встраивания',
        };

      case 'transformer':
        return {
          icon: '🧠',
          title: 'Трансформер блок — Внимание + FFN',
          details: [
            `Multi-Head Attention: ${architecture.num_heads} головок × ${formatNumber(architecture.head_dim)} размер`,
            `KV головки: ${architecture.num_kv_heads || architecture.num_heads}`,
            `FFN: расширение скрытого слоя в 4 раза`,
            `RoPE позиционные: θ = ${formatNumber(architecture.rope_theta)}`,
          ],
          badge: `Слой ${hoveredNeuron.layerIndex + 1} из ${layers.length}`,
        };

      case 'output':
        return {
          icon: '🎯',
          title: 'Выходной слой — Заголовок языковой модели',
          details: [
            `Проекция: ${formatNumber(architecture.hidden_size)} → ${formatNumber(architecture.vocab_size)}`,
            `Результат: распределение вероятностей`,
            `Softmax над всем словарём`,
          ],
          badge: 'Прогноз',
        };

      default:
        return {
          icon: '🔵',
          title: layer.name,
          details: [`Количество нейронов: ${layer.neuronCount}`],
          badge: '',
        };
    }
  };

  const content = getContent();

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
        gap: 12,
        flexShrink: 0,
        minHeight: 50,
      }}
    >
      {/* Цветной индикатор */}
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: layer.color,
          flexShrink: 0,
          boxShadow: `0 0 8px ${layer.color}`,
        }}
        aria-hidden="true"
      />

      {/* Иконка и заголовок */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 16 }}>{content.icon}</span>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#e8e8e8',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 200,
        }}>
          {content.title}
        </div>
      </div>

      {/* Детали */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: 16,
        overflowX: 'auto',
        overflowY: 'hidden',
      }}>
        {content.details.map((detail, i) => (
          <div
            key={i}
            style={{
              fontSize: 10,
              color: '#8888aa',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {detail}
          </div>
        ))}
      </div>

      {/* Бейдж */}
      {content.badge && (
        <div
          style={{
            padding: '3px 8px',
            background: '#1a1a2e',
            border: '1px solid #2a2a3e',
            borderRadius: 4,
            fontSize: 9,
            color: '#7c6ff7',
            whiteSpace: 'nowrap',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {content.badge}
        </div>
      )}
    </div>
  );
});

GGUFInfoBar.displayName = 'GGUFInfoBar';

export default GGUFInfoBar;
