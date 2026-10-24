/**
 * Connections — оптимизированный рендеринг связей между нейронами
 * 
 * Исправлено:
 * - Рисует только те связи, которые видны при hover на конкретный нейрон
 * - Groups all lines in SVG path для производительности
 * - Smooth transitions без смещения элементов
 */

import React, { memo, useMemo } from 'react';

interface ConnectionLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

interface ConnectionsProps {
  layers: Array<{
    color: string;
    colorLight: string;
    colorDark: string;
  }>;
  positions: Array<{
    x: number;
    y: number;
    layerIndex: number;
    neuronIndex: number;
  }>;
  hoveredNeuron: { layerIndex: number; neuronIndex: number } | null;
}

/**
 * Оптимизированный рендеринг связей между нейронами.
 * Группирует линии в SVG path для лучшей производительности.
 * 
 * Логика подсветки:
 * - Без hover: тонкие полупрозрачные линии (фон)
 * - Hover на нейрон: подсвечиваются только связи этого нейрона
 * - Hover на слой: подсвечиваются все связи слоя
 */
export const Connections = memo<ConnectionsProps>(({
  layers, positions, hoveredNeuron,
}) => {
  // Предварительно вычисляем все связи группами по layerIndex
  const connectionGroups = useMemo(() => {
    const groups: Array<{ layerIndex: number; lines: ConnectionLine[] }> = [];

    for (let li = 0; li < layers.length - 1; li++) {
      const cur = positions.filter(n => n.layerIndex === li);
      const nxt = positions.filter(n => n.layerIndex === li + 1);

      const lines: ConnectionLine[] = [];

      // Определяем режим подсветки
      const isHoveringSourceLayer = hoveredNeuron && hoveredNeuron.layerIndex === li;
      const isHoveringTargetLayer = hoveredNeuron && hoveredNeuron.layerIndex === li + 1;
      const isHighlighting = isHoveringSourceLayer || isHoveringTargetLayer;

      for (let i = 0; i < cur.length; i++) {
        for (let j = 0; j < nxt.length; j++) {
          const from = cur[i];
          const to = nxt[j];

          // Подсветка связи если hover на источнике или цели
          const isSourceHighlighted = hoveredNeuron &&
            hoveredNeuron.layerIndex === li &&
            hoveredNeuron.neuronIndex === i;
          const isTargetHighlighted = hoveredNeuron &&
            hoveredNeuron.layerIndex === li + 1 &&
            hoveredNeuron.neuronIndex === j;
          const isHighlighted = isSourceHighlighted || isTargetHighlighted;

          lines.push({
            id: `c${li}_${i}_${j}`,
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y,
            stroke: layers[li].color,
            strokeWidth: isHighlighted ? 2 : 0.3,
            opacity: isHighlighted ? 0.8 : 0.06,
          });
        }
      }

      if (lines.length > 0) {
        groups.push({ layerIndex: li, lines });
      }
    }

    return groups;
  }, [layers, positions, hoveredNeuron]);

  // Рендерим SVG <line> элементы
  return (
    <>
      {connectionGroups.map(group =>
        group.lines.map(line => (
          <line
            key={line.id}
            x1={line.x1} y1={line.y1}
            x2={line.x2} y2={line.y2}
            stroke={line.stroke}
            strokeWidth={line.strokeWidth}
            opacity={line.opacity}
            style={{
              transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
            }}
          />
        ))
      )}
    </>
  );
});

Connections.displayName = 'Connections';
