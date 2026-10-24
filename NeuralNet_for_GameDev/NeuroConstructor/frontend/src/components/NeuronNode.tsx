/**
 * NeuronNode — отрисовка отдельного нейрона с hover-эффектами
 * 
 * Фичи:
 * - Hover: glow-эффект, scale(1.15), показывает имя слоя
 * - Click: pulse анимация
 * - Fixed radius 11px — нет смещения при hover
 * - Smooth CSS transitions
 */

import React, { memo, useCallback, useState } from 'react';

interface NeuronNodeProps {
  x: number;
  y: number;
  layerIndex: number;
  neuronIndex: number;
  layerColor: string;
  layerColorLight: string;
  layerColorDark: string;
  layerName: string;
  isHovered: boolean;
  isDimmed: boolean;
  onHover: () => void;
  onLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

export const NeuronNode = memo<NeuronNodeProps>(({
  x, y, layerIndex, neuronIndex, layerColor,
  isHovered, isDimmed, layerName,
  onHover, onLeave, onFocus, onBlur,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);
  }, []);

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Нейрон: ${layerName}, позиция ${neuronIndex + 1}`}
      aria-selected={isHovered}
      onMouseEnter={(e) => {
        e.stopPropagation();
        onHover();
      }}
      onMouseLeave={onLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
      style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
      opacity={isDimmed ? 0.15 : 1}
    >
      {/* Pulse анимация при клике */}
      {isAnimating && (
        <>
          <circle cx={x} cy={y} r="11" fill="none" stroke={layerColor} strokeWidth="4" opacity="0.8">
            <animate attributeName="r" from="11" to="30" dur="0.6s" fill="freeze" />
            <animate attributeName="opacity" from="0.8" to="0" dur="0.6s" fill="freeze" />
          </circle>
        </>
      )}

      {/* Glow ring при hover */}
      {(isHovered || isAnimating) && (
        <circle
          cx={x}
          cy={y}
          r="18"
          fill="none"
          stroke={layerColor}
          strokeWidth="1"
          opacity={isHovered ? 0.4 : 0.2}
          style={{ transition: 'opacity 0.2s ease' }}
        />
      )}

      {/* Тень для глубины */}
      <circle
        cx={x}
        cy={y}
        r="11"
        fill="black"
        opacity="0.2"
        style={{ transition: 'opacity 0.2s ease' }}
      />

      {/* Основной круг с радиальным градиентом */}
      <circle
        cx={x}
        cy={y}
        r="11"
        fill={`url(#ng${layerIndex})`}
        stroke={isHovered ? '#ffffff' : layerColor}
        strokeWidth={isHovered ? 3 : 2}
        filter={isHovered ? `url(#gf${layerIndex})` : undefined}
        style={{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease, filter 0.2s ease' }}
      />

      {/* Индикатор нейрона в слое */}
      <text
        x={x}
        y={y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize="7"
        fontWeight="bold"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {neuronIndex + 1}
      </text>

      {/* Tooltip при hover */}
      {isHovered && (
        <g>
          <rect
            x={x - 80}
            y={y - 52}
            width="160"
            height="44"
            rx="6"
            fill="rgba(0,0,0,0.92)"
            stroke={layerColor}
            strokeWidth="1.5"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
          />
          <text
            x={x}
            y={y - 36}
            textAnchor="middle"
            fill="white"
            fontSize="11"
            fontWeight="600"
          >
            {layerName}
          </text>
          <text
            x={x}
            y={y - 18}
            textAnchor="middle"
            fill="#8888aa"
            fontSize="9"
          >
            Позиция: #{neuronIndex + 1}
          </text>
        </g>
      )}
    </g>
  );
});

NeuronNode.displayName = 'NeuronNode';
