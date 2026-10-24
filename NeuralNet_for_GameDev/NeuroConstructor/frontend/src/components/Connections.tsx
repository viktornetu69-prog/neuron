/**
 * Connections — оптимизированный рендеринг связей между нейронами
 * 
 * Без весов — только визуализация связей.
 * Для реальных весов — загрузите JSON через кнопку в шапке.
 */

import React, { memo, useMemo } from 'react';

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
 * Группирует линии для производительности.
 */
export const Connections = memo<ConnectionsProps>(({
  layers, positions, hoveredNeuron,
}) => {
  // Предварительно вычисляем все связи
  const connectionData = useMemo(() => {
    const allConnections: Array<{
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      fromNeuron: number;
      toNeuron: number;
      fromLayer: number;
      toLayer: number;
    }> = [];

    for (let li = 0; li < layers.length - 1; li++) {
      const cur = positions.filter(n => n.layerIndex === li);
      const nxt = positions.filter(n => n.layerIndex === li + 1);

      for (let i = 0; i < cur.length; i++) {
        for (let j = 0; j < nxt.length; j++) {
          const from = cur[i];
          const to = nxt[j];
          allConnections.push({
            id: `c${li}_${i}_${j}`,
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y,
            fromNeuron: i,
            toNeuron: j,
            fromLayer: li,
            toLayer: li + 1,
          });
        }
      }
    }

    return allConnections;
  }, [layers, positions]);

  // Определяем режим подсветки
  const isSourceLayer = hoveredNeuron && hoveredNeuron.layerIndex >= 0;
  const highlightSourceLayer = isSourceLayer ? hoveredNeuron!.layerIndex : -1;
  const highlightTargetLayer = isSourceLayer ? hoveredNeuron!.layerIndex + 1 : -1;
  const highlightSourceNeuron = isSourceLayer ? hoveredNeuron!.neuronIndex : -1;
  const highlightTargetNeuron = isSourceLayer ? hoveredNeuron!.neuronIndex : -1;

  return (
    <>
      {connectionData.map(conn => {
        const fromLayerIdx = conn.fromLayer;
        const toLayerIdx = conn.toLayer;
        const isSourceInHighlight = fromLayerIdx === highlightSourceLayer;
        const isSourceNeuron = conn.fromNeuron === highlightSourceNeuron;
        const isTargetInHighlight = toLayerIdx === highlightTargetLayer;
        const isTargetNeuron = conn.toNeuron === highlightTargetNeuron;
        
        // Подсвечиваем связи ОТ hovered нейрона и К hovered нейрону
        const isHighlighted = 
          (isSourceInHighlight && isSourceNeuron) ||
          (isTargetInHighlight && isTargetNeuron);

        // Определяем цвет слоя для связи
        const layerColor = layers[conn.fromLayer]?.color || '#555577';

        return (
          <g
            key={conn.id}
            style={{ cursor: 'pointer' }}
          >
            <line
              x1={conn.x1} y1={conn.y1}
              x2={conn.x2} y2={conn.y2}
              stroke={isHighlighted ? '#7c6ff7' : '#3a3a4e'}
              strokeWidth={isHighlighted ? 1.5 : 0.5}
              opacity={isHighlighted ? 0.8 : 0.15}
              style={{ 
                transition: 'stroke-width 0.2s ease, opacity 0.2s ease, stroke 0.2s ease',
              }}
            />
          </g>
        );
      })}
    </>
  );
});

Connections.displayName = 'Connections';
