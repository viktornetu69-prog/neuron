/**
 * ChunkDetail — визуальная схема чанка с нейронами-кружками и связями
 * 
 * При клике на чанк в основной модели:
 * - Нейроны чанка в виде сетки кружков
 * - Линии связей между нейронами внутри чанка
 * - Входящие/исходящие связи с соседними чанками
 * - Подпись слоя и количество связей
 */

import React, { memo } from 'react';

interface ChunkData {
  x: number;
  y: number;
  layerIndex: number;
  chunkIndex: number;
  startNeuron: number;
  endNeuron: number;
  size: number;
}

interface ConnectionNeighbor {
  startNeuron: number;
  endNeuron: number;
  prevChunkIndex?: number;
  nextChunkIndex?: number;
}

interface ChunkDetailProps {
  chunk: ChunkData;
  layerName: string;
  layerColor: string;
  layerColorLight: string;
  onBack: () => void;
  incomingNeighbors: ConnectionNeighbor[];
  outgoingNeighbors: ConnectionNeighbor[];
}

const NEURON_RADIUS = 5;
const NEURON_GAP = 3;

// Детерминированный рандом для связей
function seededRandom(a: number, b: number): number {
  const x = Math.sin(a * 9301 + b * 49297) * 49297;
  return x - Math.floor(x);
}

function generateConnections(
  fromStart: number,
  fromEnd: number,
  toStart: number,
  toEnd: number,
  maxConnections: number
): Array<[number, number]> {
  const connections: Array<[number, number]> = [];
  const count = Math.min(maxConnections, (fromEnd - fromStart + 1) * (toEnd - toStart + 1));
  
  for (let i = 0; i < count; i++) {
    const fromIdx = fromStart + Math.floor(seededRandom(i, 1000 + fromStart) * (fromEnd - fromStart + 1));
    const toIdx = toStart + Math.floor(seededRandom(i, 2000 + toStart) * (toEnd - toStart + 1));
    if (fromIdx >= fromStart && fromIdx <= fromEnd && toIdx >= toStart && toIdx <= toEnd) {
      connections.push([fromIdx - fromStart, toIdx - toStart]);
    }
  }
  return connections;
}

const ChunkDetail: React.FC<ChunkDetailProps> = memo(({
  chunk,
  layerName,
  layerColor,
  layerColorLight,
  onBack,
  incomingNeighbors,
  outgoingNeighbors,
}) => {
  const neuronCount = chunk.endNeuron - chunk.startNeuron + 1;
  // Показываем максимум 100 нейронов для производительности
  const displayCount = Math.min(neuronCount, 100);
  const cols = Math.min(Math.ceil(Math.sqrt(displayCount)), 10);
  const rows = Math.min(Math.ceil(displayCount / cols), 10);
  
  // Позиции нейронов
  const positions: Array<{x: number; y: number; idx: number}> = [];
  for (let i = 0; i < displayCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.push({
      x: col * (NEURON_RADIUS * 2 + NEURON_GAP),
      y: row * (NEURON_RADIUS * 2 + NEURON_GAP),
      idx: i,
    });
  }

  // Внутренние связи
  const internalConns: Array<[number, number]> = [];
  for (let i = 0; i < displayCount && internalConns.length < 80; i++) {
    for (let j = i + 1; j < displayCount && internalConns.length < 80; j++) {
      if (seededRandom(i, j) < 0.25) {
        internalConns.push([i, j]);
      }
    }
  }

  // Входящие связи
  const incomingConns = incomingNeighbors.length > 0
    ? generateConnections(
        incomingNeighbors[0].startNeuron,
        incomingNeighbors[0].endNeuron,
        chunk.startNeuron,
        chunk.endNeuron,
        12
      )
    : [];

  // Исходящие связи
  const outgoingConns = outgoingNeighbors.length > 0
    ? generateConnections(
        chunk.startNeuron,
        chunk.endNeuron,
        outgoingNeighbors[0].startNeuron,
        outgoingNeighbors[0].endNeuron,
        12
      )
    : [];

  // Размеры
  const gridWidth = cols * (NEURON_RADIUS * 2 + NEURON_GAP);
  const gridHeight = rows * (NEURON_RADIUS * 2 + NEURON_GAP);
  const gridX = -gridWidth / 2;
  const gridY = -30;

  return (
    <g>
      {/* Фон */}
      <rect
        x="-450"
        y="-180"
        width="900"
        height="360"
        rx="16"
        fill="rgba(10, 10, 15, 0.97)"
        stroke={layerColor}
        strokeWidth="2"
      />

      {/* Заголовок */}
      <text
        x="-380"
        y="-150"
        textAnchor="middle"
        fill="white"
        fontSize="14"
        fontWeight="700"
      >
        {layerName}
      </text>
      <text
        x="-380"
        y="-134"
        textAnchor="middle"
        fill="#8888aa"
        fontSize="10"
      >
        Чанк {chunk.chunkIndex + 1} | Нейроны {chunk.startNeuron}–{chunk.endNeuron}
      </text>

      {/* Кнопка закрытия */}
      <g onClick={onBack} style={{ cursor: 'pointer' }}>
        <rect
          x="400"
          y="-165"
          width="28"
          height="28"
          rx="6"
          fill="#1a1a2e"
          stroke="#3a3a4e"
          strokeWidth="1.5"
        />
        <text
          x="414"
          y="-145"
          textAnchor="middle"
          fill="#8888aa"
          fontSize="14"
          fontWeight="700"
        >
          ✕
        </text>
      </g>

      {/* ===== ВХОДЯЩИЕ СВЯЗИ ===== */}
      {incomingNeighbors.length > 0 && (
        <g>
          <text
            x="-320"
            y={gridY - 50}
            textAnchor="middle"
            fill="#10b981"
            fontSize="10"
            fontWeight="600"
          >
            ← {incomingConns.length} входящих
          </text>
          {/* Нейроны предыдущего чанка */}
          {[...Array(6)].map((_, i) => (
            <circle
              key={`prev-${i}`}
              cx={-400 + i * 22}
              cy={gridY - 30}
              r={NEURON_RADIUS}
              fill="#10b981"
              opacity="0.4"
              stroke="#10b981"
              strokeWidth="1"
            />
          ))}
          {/* Линии связей */}
          {incomingConns.map((conn, idx) => {
            const fromX = -400 + (idx % 6) * 22;
            const fromY = gridY - 30;
            const toPos = positions[Math.min(conn[1], positions.length - 1)];
            if (!toPos) return null;
            return (
              <line
                key={`inc-${idx}`}
                x1={fromX}
                y1={fromY}
                x2={toPos.x + NEURON_RADIUS}
                y2={toPos.y}
                stroke="#10b981"
                strokeWidth="0.5"
                opacity="0.25"
              />
            );
          })}
        </g>
      )}

      {/* ===== ОСНОВНАЯ СЕТКА НЕЙРОНОВ ===== */}
      {/* Внутренние связи — линии */}
      {internalConns.map(([a, b], idx) => {
        const from = positions[a];
        const to = positions[b];
        if (!from || !to) return null;
        return (
          <line
            key={`int-${idx}`}
            x1={from.x + NEURON_RADIUS}
            y1={from.y}
            x2={to.x}
            y2={to.y + NEURON_RADIUS}
            stroke={layerColor}
            strokeWidth="0.4"
            opacity="0.12"
          />
        );
      })}
      
      {/* Нейроны — кружки */}
      {positions.map((pos, idx) => (
        <circle
          key={`n-${idx}`}
          cx={pos.x}
          cy={pos.y}
          r={NEURON_RADIUS}
          fill={layerColor}
          opacity={0.3 + (idx / Math.max(1, displayCount - 1)) * 0.5}
          stroke={layerColorLight}
          strokeWidth="1"
        />
      ))}

      {/* ===== ИСХОДЯЩИЕ СВЯЗИ ===== */}
      {outgoingNeighbors.length > 0 && (
        <g>
          <text
            x="320"
            y={gridY - 50}
            textAnchor="middle"
            fill="#f97316"
            fontSize="10"
            fontWeight="600"
          >
            {outgoingConns.length} исходящих →
          </text>
          {/* Линии связей */}
          {outgoingConns.map((conn, idx) => {
            const fromPos = positions[Math.min(conn[0], positions.length - 1)];
            if (!fromPos) return null;
            const toX = 400 + (idx % 6) * 22;
            const toY = gridY - 30;
            return (
              <line
                key={`out-${idx}`}
                x1={fromPos.x + NEURON_RADIUS}
                y1={fromPos.y}
                x2={toX}
                y2={toY}
                stroke="#f97316"
                strokeWidth="0.5"
                opacity="0.25"
              />
            );
          })}
          {/* Нейроны следующего чанка */}
          {[...Array(6)].map((_, i) => (
            <circle
              key={`next-${i}`}
              cx={400 + i * 22}
              cy={gridY - 30}
              r={NEURON_RADIUS}
              fill="#f97316"
              opacity="0.4"
              stroke="#f97316"
              strokeWidth="1"
            />
          ))}
        </g>
      )}

      {/* Статистика */}
      <text
        x="0"
        y="140"
        textAnchor="middle"
        fill="#666688"
        fontSize="9"
      >
        {displayCount} нейронов • {internalConns.length} внутр. • {incomingConns.length} вход. • {outgoingConns.length} исх.
      </text>
    </g>
  );
});

ChunkDetail.displayName = 'ChunkDetail';

export default ChunkDetail;
