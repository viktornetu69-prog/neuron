/**
 * GGUFGroup — визуализация GGUF-специфичных групп слоёв
 * 
 * Исправлено:
 * - Все тексты на русском языке
 * - Элементы не накладываются друг на друга (каждый ниже предыдущего)
 * - Улучшенная читаемость подписей
 */

import React, { memo } from 'react';
import { GGUFGroupConfig, GGUFGroupType } from './gguf-layer-config';

// ============================================================================
// Типы
// ============================================================================

interface GGUFGroupProps {
  config: GGUFGroupConfig;
  layerIndex: number;
  totalLayers: number;
  isActive: boolean;
  onClick: (layerIndex: number) => void;
  x: number;
  y: number;
}

// ============================================================================
// SVG элементы для различных типов слоёв
// ============================================================================

/**
 * Визуализация матрицы весов (для embedding/output слоёв)
 *
 * Исправлено: убран Math.random() — теперь opacity детерминированный,
 * зависит от позиции в матрице. Это убирает мерцание и случайное выделение.
 */
const WeightMatrix: React.FC<{ color: string; size?: number }> = memo(({ color, size = 40 }) => (
  <g>
    {[...Array(5)].map((_, row) =>
      [...Array(5)].map((_, col) => {
        // Детерминированное значение opacity на основе позиции
        // Диапазон: 0.3 — 0.7, паттерн "тепловой карты"
        const baseValue = (row + col) / (4 + 4); // 0.0 — 1.0
        const opacity = 0.3 + baseValue * 0.4;
        return (
          <rect
            key={`m${row}_${col}`}
            x={-size / 2 + col * (size / 5)}
            y={-size / 2 + row * (size / 5)}
            width={size / 5 - 1}
            height={size / 5 - 1}
            fill={color}
            opacity={opacity}
            rx="1"
          />
        );
      })
    )}
    <rect
      x={-size / 2}
      y={-size / 2}
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth="1"
      rx="2"
      opacity="0.6"
    />
  </g>
));

WeightMatrix.displayName = 'WeightMatrix';

/**
 * Визуализация attention heads (для transformer блоков)
 */
const AttentionHeads: React.FC<{ color: string; count?: number }> = memo(({ color, count = 8 }) => {
  const displayCount = Math.min(count, 8);
  const headWidth = 6;
  const gap = 3;
  const totalWidth = displayCount * headWidth + (displayCount - 1) * gap;
  
  return (
    <g>
      {[...Array(displayCount)].map((_, i) => {
        const x = -totalWidth / 2 + i * (headWidth + gap);
        return (
          <rect
            key={`h${i}`}
            x={x}
            y="-10"
            width={headWidth}
            height="20"
            fill={color}
            opacity={0.3 + (i / displayCount) * 0.5}
            rx="1"
          />
        );
      })}
      <text x="0" y="22" textAnchor="middle" fill="#8888aa" fontSize="7">
        {displayCount} заголовков
      </text>
    </g>
  );
});

AttentionHeads.displayName = 'AttentionHeads';

/**
 * Визуализация FFN блока (Feed-Forward Network)
 */
const FFNBlock: React.FC<{ color: string }> = memo(({ color }) => (
  <g>
    <rect x="-25" y="-15" width="50" height="12" fill={color} opacity="0.4" rx="2" />
    <rect x="-25" y="0" width="50" height="12" fill={color} opacity="0.6" rx="2" />
    <rect x="-25" y="15" width="50" height="12" fill={color} opacity="0.4" rx="2" />
    <text x="0" y="37" textAnchor="middle" fill="#8888aa" fontSize="7">
      FFN (×4 скрытый)
    </text>
  </g>
));

FFNBlock.displayName = 'FFNBlock';

/**
 * Визуализация нормализации слоя (LayerNorm)
 */
const LayerNorm: React.FC<{ color: string }> = memo(({ color }) => (
  <g>
    <circle
      cx="0"
      cy="0"
      r="8"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeDasharray="4,2"
      opacity="0.6"
    />
    <text x="0" y="22" textAnchor="middle" fill="#8888aa" fontSize="7">
      Нормализация
    </text>
  </g>
));

LayerNorm.displayName = 'LayerNorm';

// ============================================================================
// Основной компонент
// ============================================================================

const GGUFGroup: React.FC<GGUFGroupProps> = ({
  config,
  layerIndex,
  totalLayers,
  isActive,
  onClick,
  x,
  y,
}) => {
  const renderVisualElements = (): React.ReactNode => {
    switch (config.type) {
      case 'input':
        return (
          <g>
            <text x="0" y="-20" textAnchor="middle" fill="#e8e8e8" fontSize="9" fontWeight="600">
              📝 Токенизатор
            </text>
            <rect
              x="-35"
              y="-6"
              width="70"
              height="18"
              fill="#ef4444"
              opacity="0.25"
              rx="4"
            />
            <text x="0" y="7" textAnchor="middle" fill="#fff" fontSize="8">
              Текст → Номера
            </text>
          </g>
        );

      case 'embedding':
        return (
          <g>
            <text x="0" y="-20" textAnchor="middle" fill="#e8e8e8" fontSize="9" fontWeight="600">
              🔤 Матрицы Встраиваний
            </text>
            <WeightMatrix color="#f97316" size={30} />
            <text x="0" y="24" textAnchor="middle" fill="#8888aa" fontSize="7">
              Слова + Позиции
            </text>
          </g>
        );

      case 'hidden':
        return (
          <g>
            {/* Attention heads — самый верхний элемент */}
            <g transform="translate(0, -18)">
              <AttentionHeads color="#84cc16" count={config.layerCount > 12 ? 12 : config.layerCount} />
            </g>
            {/* FFN блок — ниже */}
            <g transform="translate(0, 5)">
              <FFNBlock color="#84cc16" />
            </g>
            {/* Нормализация — две штуки по бокам внизу */}
            <g transform="translate(-22, 26)">
              <LayerNorm color="#84cc16" />
            </g>
            <g transform="translate(22, 26)">
              <LayerNorm color="#84cc16" />
            </g>
          </g>
        );

      case 'output':
        return (
          <g>
            <text x="0" y="-20" textAnchor="middle" fill="#e8e8e8" fontSize="9" fontWeight="600">
              🎯 Заголовок ЯМ
            </text>
            <WeightMatrix color="#10b981" size={28} />
            <text x="0" y="24" textAnchor="middle" fill="#8888aa" fontSize="7">
              Проекция → Словарь
            </text>
          </g>
        );

      default:
        return null;
    }
  };

  return (
    <g
      onClick={() => onClick(layerIndex)}
      style={{ cursor: 'pointer' }}
      opacity={isActive ? 1 : 0.7}
    >
      {/* Glow effect при активности */}
      {isActive && (
        <circle
          cx={x}
          cy={y}
          r="25"
          fill="none"
          stroke={config.color}
          strokeWidth="2"
          opacity="0.3"
        >
          <animate
            attributeName="r"
            values="25;30;25"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Базовый круг */}
      <circle
        cx={x}
        cy={y}
        r="18"
        fill={`url(#gguf-${config.type})`}
        stroke={config.color}
        strokeWidth="2"
      />

      {/* Визуальные элементы */}
      <g transform={`translate(${x}, ${y})`}>
        {renderVisualElements()}
      </g>

      {/* Подпись */}
      <text
        x={x}
        y={y + 52}
        textAnchor="middle"
        fill={config.color}
        fontSize="8"
        fontWeight="700"
      >
        {config.name}
      </text>
      <text
        x={x}
        y={y + 61}
        textAnchor="middle"
        fill="#8888aa"
        fontSize="7"
      >
        {config.description}
      </text>
    </g>
  );
};

GGUFGroup.displayName = 'GGUFGroup';

export default GGUFGroup;
