/**
 * NeuronNode — отрисовка отдельного нейрона
 * 
 * Исправлено:
 * - Фиксированный радиус (hover только меняет opacity/border)
 * - Smooth transitions без смещения элементов
 * - Убрана анимация размера при hover (было смещение)
 */

import React, { memo, useCallback } from 'react';

interface NeuronNodeProps {
  x: number;
  y: number;
  layerIndex: number;
  neuronIndex: number;
  layerColor: string;
  layerColorLight: string;
  layerColorDark: string;
  isHovered: boolean;
  isDimmed: boolean;
  onHover: () => void;
  onLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

/**
 * Отдельный нейрон с hover-состояниями и ARIA-атрибутами.
 * Использует memo для предотвращения лишних перерисовок.
 * 
 * @param x - Координата X нейрона
 * @param y - Координата Y нейрона
 * @param layerIndex - Индекс слоя (0-based)
 * @param neuronIndex - Индекс нейрона в слое (0-based)
 * @param layerColor - Основной цвет слоя
 * @param layerColorLight - Светлый оттенок для градиента
 * @param layerColorDark - Тёмный оттенок для градиента
 * @param isHovered - Подсвечен ли нейрон
 * @param isDimmed - Затемнён ли (когда hover на другом нейроне)
 * @param onHover - Обработчик наведения мыши
 * @param onLeave - Обработчик ухода мыши
 * @param onFocus - Обработчик фокуса (клавиатура)
 * @param onBlur - Обработчик потери фокуса
 */
export const NeuronNode = memo<NeuronNodeProps>(({
  x,
  y,
  layerIndex,
  neuronIndex,
  layerColor,
  isHovered,
  isDimmed,
  onHover,
  onLeave,
  onFocus,
  onBlur,
}) => (
  <g
    role="button"
    tabIndex={0}
    aria-label={`Нейрон слоя ${layerIndex + 1}, позиция ${neuronIndex + 1}`}
    aria-selected={isHovered}
    onMouseEnter={onHover}
    onMouseLeave={onLeave}
    onFocus={onFocus}
    onBlur={onBlur}
    style={{
      transition: 'opacity 0.2s ease',
      cursor: 'pointer',
    }}
    opacity={isDimmed ? 0.15 : 1}
  >
    {/* Внешнее кольцо при hover (не меняет размер основного круга) */}
    {isHovered && (
      <circle
        cx={x}
        cy={y}
        r="13"
        fill="none"
        stroke={layerColor}
        strokeWidth="2"
        opacity="0.6"
        style={{
          transition: 'opacity 0.2s ease',
        }}
      />
    )}
    {/* Основной круг — фиксированный радиус 11px */}
    <circle
      cx={x}
      cy={y}
      r={11}
      fill={`url(#ng${layerIndex})`}
      stroke={isHovered ? layerColor : `${layerColor}80`}
      strokeWidth={isHovered ? 3 : 1.5}
      filter={isHovered ? `url(#gf${layerIndex})` : undefined}
      style={{
        transition: 'stroke 0.2s ease, stroke-width 0.2s ease, filter 0.2s ease',
      }}
    />
  </g>
));

NeuronNode.displayName = 'NeuronNode';
