/**
 * GGUFGroup — визуализация GGUF-специфичных групп слоёв
 * Отображает специфичные элементы: матрицы, attention heads, FFN блоки
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
 */
const WeightMatrix: React.FC<{ color: string; size?: number }> = memo(({ color, size = 40 }) => (
  <g>
    {/* Grid матрицы */}
    {[...Array(5)].map((_, row) =>
      [...Array(5)].map((_, col) => (
        <rect
          key={`m${row}_${col}`}
          x={-size / 2 + col * (size / 5)}
          y={-size / 2 + row * (size / 5)}
          width={size / 5 - 1}
          height={size / 5 - 1}
          fill={color}
          opacity={0.3 + Math.random() * 0.4}
          rx="1"
        />
      ))
    )}
    {/* Граница */}
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
const AttentionHeads: React.FC<{ color: string; count?: number }> = memo(({ color, count = 8 }) => (
  <g>
    {[...Array(Math.min(count, 8))].map((_, i) => {
      const headWidth = 6;
      const gap = 3;
      const totalWidth = count * headWidth + (count - 1) * gap;
      const x = -totalWidth / 2 + i * (headWidth + gap);
      
      return (
        <rect
          key={`h${i}`}
          x={x}
          y="-10"
          width={headWidth}
          height="20"
          fill={color}
          opacity={0.3 + (i / count) * 0.5}
          rx="1"
        />
      );
    })}
    {/* Подписи */}
    <text x="0" y="20" textAnchor="middle" fill="#8888aa" fontSize="8">
      {count} heads
    </text>
  </g>
));

AttentionHeads.displayName = 'AttentionHeads';

/**
 * Визуализация FFN блока (Feed-Forward Network)
 */
const FFNBlock: React.FC<{ color: string }> = memo(({ color }) => (
  <g>
    {/* Input projection */}
    <rect
      x="-25"
      y="-15"
      width="50"
      height="12"
      fill={color}
      opacity="0.4"
      rx="2"
    />
    {/* Activation */}
    <rect
      x="-25"
      y="0"
      width="50"
      height="12"
      fill={color}
      opacity="0.6"
      rx="2"
    />
    {/* Output projection */}
    <rect
      x="-25"
      y="15"
      width="50"
      height="12"
      fill={color}
      opacity="0.4"
      rx="2"
    />
    <text x="0" y="35" textAnchor="middle" fill="#8888aa" fontSize="8">
      FFN (hidden×4)
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
    <text x="0" y="20" textAnchor="middle" fill="#8888aa" fontSize="8">
      LayerNorm
    </text>
  </g>
));

LayerNorm.displayName = 'LayerNorm';

// ============================================================================
// Основной компонент
// ============================================================================

/**
 * GGUFGroup — отрисовывает специфичные элементы для группы слоёв
 */
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
            {/* Tokenizer icon */}
            <text x="0" y="-15" textAnchor="middle" fill="#e8e8e8" fontSize="10" fontWeight="600">
              🔤 Tokenizer
            </text>
            <rect
              x="-30"
              y="-5"
              width="60"
              height="20"
              fill="#ef4444"
              opacity="0.3"
              rx="4"
            />
            <text x="0" y="8" textAnchor="middle" fill="#fff" fontSize="9">
              Text → IDs
            </text>
          </g>
        );

      case 'embedding':
        return (
          <g>
            {/* Embedding weights */}
            <text x="0" y="-15" textAnchor="middle" fill="#e8e8e8" fontSize="10" fontWeight="600">
              Embedding Weights
            </text>
            <WeightMatrix color="#f97316" size={35} />
            <text x="0" y="28" textAnchor="middle" fill="#8888aa" fontSize="8">
              Wte + Wpe
            </text>
          </g>
        );

      case 'hidden':
        return (
          <g>
            {/* Attention heads */}
            <AttentionHeads color="#84cc16" count={config.layerCount > 12 ? 12 : config.layerCount} />
            {/* FFN block */}
            <g transform="translate(0, 35)">
              <FFNBlock color="#84cc16" />
            </g>
            {/* Layer norm */}
            <g transform="translate(-30, 35)">
              <LayerNorm color="#84cc16" />
            </g>
            <g transform="translate(30, 35)">
              <LayerNorm color="#84cc16" />
            </g>
          </g>
        );

      case 'output':
        return (
          <g>
            <text x="0" y="-15" textAnchor="middle" fill="#e8e8e8" fontSize="10" fontWeight="600">
              LM Head
            </text>
            <WeightMatrix color="#10b981" size={30} />
            <text x="0" y="28" textAnchor="middle" fill="#8888aa" fontSize="8">
              Projection → vocab
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
      {/* Glow effect */}
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

      {/* Base circle */}
      <circle
        cx={x}
        cy={y}
        r="18"
        fill={`url(#gguf-${config.type})`}
        stroke={config.color}
        strokeWidth="2"
      />

      {/* Visual elements */}
      <g transform={`translate(${x}, ${y})`}>
        {renderVisualElements()}
      </g>

      {/* Label */}
      <text
        x={x}
        y={y + 35}
        textAnchor="middle"
        fill={config.color}
        fontSize="9"
        fontWeight="700"
      >
        {config.name}
      </text>
      <text
        x={x}
        y={y + 45}
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
