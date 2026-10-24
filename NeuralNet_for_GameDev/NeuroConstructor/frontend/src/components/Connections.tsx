/**
 * Connections — оптимизированный рендеринг связей с весами между нейронами
 * 
 * Фичи:
 * - Каждый connection имеет свой вес (-1.0 → +1.0)
 * - Толщина линии = |weight|
 * - Зелёный = положительный вес, красный = отрицательный
 * - Hover на нейроне → подсвечиваются ТОЛЬКО его связи
 * - Hover на связи → показывается точное значение веса
 * - Click на связь → открывается detail panel
 */

import React, { memo, useMemo, useState, useCallback } from 'react';

interface ConnectionWeight {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  weight: number;          // -1.0 → +1.0
  fromNeuron: number;      // индекс нейрона в источнике
  toNeuron: number;        // индекс нейрона в цели
  fromLayer: number;       // индекс слоя источника
  toLayer: number;         // индекс слоя цели
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
  onConnectionHover?: (conn: ConnectionWeight | null) => void;
}

/**
 * Генерирует псевдослучайное число на основе двух целых чисел.
 * Детерминированное — всегда одинаковое для одних и тех же входных данных.
 */
function seededRandom(a: number, b: number): number {
  const x = Math.sin(a * 9301 + b * 49297) * 49297;
  return x - Math.floor(x);
}

/**
 * Оптимизированный рендеринг связей с весами между нейронами.
 * Группирует линии для производительности.
 */
export const Connections = memo<ConnectionsProps>(({
  layers, positions, hoveredNeuron, onConnectionHover,
}) => {
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  // Предварительно вычисляем все связи с весами
  const connectionData = useMemo<ConnectionWeight[]>(() => {
    const allConnections: ConnectionWeight[] = [];

    for (let li = 0; li < layers.length - 1; li++) {
      const cur = positions.filter(n => n.layerIndex === li);
      const nxt = positions.filter(n => n.layerIndex === li + 1);

      for (let i = 0; i < cur.length; i++) {
        for (let j = 0; j < nxt.length; j++) {
          const from = cur[i];
          const to = nxt[j];

          // Детерминированный вес на основе индексов
          const raw = seededRandom(from.neuronIndex, to.neuronIndex + li * 100);
          const weight = (raw * 2 - 1) * 0.8; // -0.8 → +0.8

          allConnections.push({
            id: `c${li}_${i}_${j}`,
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y,
            weight,
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

  // Фильтруем для отрисовки
  const displayConnections = useMemo(() => {
    if (!hoveredNeuron) {
      // Без hover — показываем все связи тонкими
      return connectionData.map(c => ({
        ...c,
        strokeWidth: Math.max(0.3, Math.abs(c.weight) * 1.5),
        opacity: 0.04,
        stroke: '#555577',
        isHighlighted: false,
        isHovered: false,
      }));
    }

    return connectionData.map(c => {
      const fromLayerIdx = c.fromLayer;
      const isSourceInHighlight = fromLayerIdx === highlightSourceLayer;
      const isSourceNeuron = c.fromNeuron === highlightSourceNeuron;
      const isHighlighted = isSourceInHighlight && isSourceNeuron;
      const isDimmed = !isHighlighted && hoveredNeuron.layerIndex !== c.toLayer;

      return {
        ...c,
        strokeWidth: isHighlighted ? Math.max(1, Math.abs(c.weight) * 3) : (isDimmed ? 0.15 : Math.max(0.3, Math.abs(c.weight) * 1.5)),
        opacity: isHighlighted ? 0.7 : (isDimmed ? 0.01 : 0.04),
        stroke: isHighlighted
          ? c.weight >= 0 ? '#10b981' : '#ef4444'
          : '#555577',
        isHighlighted,
        isHovered: hoveredConnection === c.id,
      };
    });
  }, [connectionData, hoveredNeuron, highlightSourceLayer, highlightTargetLayer, highlightSourceNeuron, hoveredConnection]);

  const handleConnMouseEnter = useCallback((id: string) => {
    setHoveredConnection(id);
    const conn = connectionData.find(c => c.id === id);
    if (conn) onConnectionHover?.(conn);
  }, [connectionData, onConnectionHover]);

  const handleConnMouseLeave = useCallback(() => {
    setHoveredConnection(null);
    onConnectionHover?.(null);
  }, [onConnectionHover]);

  return (
    <>
      {displayConnections.map(conn => (
        <g
          key={conn.id}
          onMouseEnter={() => handleConnMouseEnter(conn.id)}
          onMouseLeave={handleConnMouseLeave}
          style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
        >
          <line
            x1={conn.x1} y1={conn.y1}
            x2={conn.x2} y2={conn.y2}
            stroke={conn.stroke}
            strokeWidth={conn.strokeWidth}
            opacity={conn.opacity}
            style={{ transition: 'stroke-width 0.2s ease, opacity 0.2s ease' }}
          />
          {/* Показываем текст веса только для highlighted связей */}
          {conn.isHighlighted && Math.abs(conn.weight) > 0.3 && (
            <text
              x={(conn.x1 + conn.x2) / 2}
              y={(conn.y1 + conn.y2) / 2 - 4}
              textAnchor="middle"
              fill={conn.weight >= 0 ? '#10b981' : '#ef4444'}
              fontSize="8"
              fontWeight="bold"
              opacity="0.9"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {conn.weight > 0 ? '+' : ''}{conn.weight.toFixed(2)}
            </text>
          )}
          {/* Подсветка при hover на связь */}
          {conn.isHovered && (
            <circle
              cx={(conn.x1 + conn.x2) / 2}
              cy={(conn.y1 + conn.y2) / 2}
              r="6"
              fill="none"
              stroke="#7c6ff7"
              strokeWidth="2"
              opacity="0.6"
            />
          )}
        </g>
      ))}
    </>
  );
});

Connections.displayName = 'Connections';
