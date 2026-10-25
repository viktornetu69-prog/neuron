/**
 * Connections — оптимизированный рендеринг связей между чанками
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
    chunkIndex: number;
    startNeuron: number;
    endNeuron: number;
    size: number;
  }>;
  hoveredChunk: { layerIndex: number; chunkIndex: number } | null;
}

/**
 * Оптимизированный рендеринг связей между чанками.
 */
export const Connections = memo<ConnectionsProps>(({
  layers, positions, hoveredChunk,
}) => {
  // Предварительно вычисляем все связи между чанками
  const connectionData = useMemo(() => {
    const allConnections: Array<{
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      fromChunk: number;
      toChunk: number;
      fromLayer: number;
      toLayer: number;
    }> = [];

    for (let li = 0; li < layers.length - 1; li++) {
      const cur = positions.filter(c => c.layerIndex === li);
      const nxt = positions.filter(c => c.layerIndex === li + 1);

      for (let i = 0; i < cur.length; i++) {
        for (let j = 0; j < nxt.length; j++) {
          const from = cur[i];
          const to = nxt[j];
          allConnections.push({
            id: `c${li}_${i}_${j}`,
            x1: from.x + 20,  // сдвиг вправо от чанка
            y1: from.y + 10,
            x2: to.x - 20,    // сдвиг влево к чанку
            y2: to.y + 10,
            fromChunk: i,
            toChunk: j,
            fromLayer: li,
            toLayer: li + 1,
          });
        }
      }
    }

    return allConnections;
  }, [layers, positions]);

  // Подсветка только для конкретного чанка: входящие + исходящие связи
  const highlightLayer = hoveredChunk?.layerIndex ?? -1;
  const highlightChunk = hoveredChunk?.chunkIndex ?? -1;

  return (
    <>
      {connectionData.map(conn => {
        // Исходящая связь: из этого чанка в следующий слой
        const isOutgoing =
          conn.fromLayer === highlightLayer &&
          conn.fromChunk === highlightChunk;

        // Входящая связь: из предыдущего слоя в этот чанк
        const isIncoming =
          conn.toLayer === highlightLayer &&
          conn.toChunk === highlightChunk;

        // Подсвечиваем только входящие и исходящие конкретного чанка
        const isHighlighted = isOutgoing || isIncoming;

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
