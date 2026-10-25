/**
 * ChunkDetail — крупный план одного чанка с нейронами и входящими/исходящими связями
 *
 * При клике на чанк в основной модели — показывается детальный вид:
 * - Нейроны чанка (сетка)
 * - Входящие связи из предыдущего слоя (соседний чанк того же слоя)
 * - Исходящие связи в следующий слой (соседний чанк следующего слоя)
 * - Соседние чанки/слои НЕ показываются
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

interface ChunkDetailProps {
  chunk: ChunkData;
  layerName: string;
  layerColor: string;
  layerColorLight: string;
  onBack: () => void;
  incomingNeighbors: Array<{ startNeuron: number; endNeuron: number; prevChunkIndex: number }>;
  outgoingNeighbors: Array<{ startNeuron: number; endNeuron: number; nextChunkIndex: number }>;
}

const NEURON_SIZE = 8;
const NEURON_GAP = 3;

const ChunkDetail: React.FC<ChunkDetailProps> = memo(({
  chunk,
  layerName,
  layerColor,
  layerColorLight,
  onBack,
  incomingNeighbors,
  outgoingNeighbors,
}) => {
  // Вычисляем количество нейронов в чанке
  const neuronCount = chunk.endNeuron - chunk.startNeuron + 1;
  // Сетка нейронов: автоматическое определение количества столбцов
  const cols = Math.ceil(Math.sqrt(neuronCount));
  const rows = Math.ceil(neuronCount / cols);
  const gridSize = cols * (NEURON_SIZE + NEURON_GAP) + NEURON_GAP;

  return (
    <g>
      {/* Фон — тёмная подложка */}
      <rect
        x="-350"
        y="-200"
        width="700"
        height="400"
        rx="12"
        fill="rgba(10, 10, 15, 0.95)"
        stroke={layerColor}
        strokeWidth="2"
      />

      {/* Заголовок */}
      <text
        x="0"
        y="-170"
        textAnchor="middle"
        fill="white"
        fontSize="14"
        fontWeight="700"
      >
        {layerName}
      </text>
      <text
        x="0"
        y="-152"
        textAnchor="middle"
        fill="#8888aa"
        fontSize="10"
      >
        Чанк {chunk.chunkIndex + 1}: нейроны {chunk.startNeuron}–{chunk.endNeuron} ({neuronCount} нейронов)
      </text>

      {/* Кнопка закрытия */}
      <g
        onClick={onBack}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x="280"
          y="-185"
          width="24"
          height="24"
          rx="4"
          fill="#1a1a2e"
          stroke="#3a3a4e"
          strokeWidth="1"
        />
        <text
          x="292"
          y="-167"
          textAnchor="middle"
          fill="#8888aa"
          fontSize="12"
          fontWeight="600"
        >
          ✕
        </text>
      </g>

      {/* Входящие связи — из предыдущего слоя */}
      {incomingNeighbors.length > 0 && (
        <>
          <text
            x="-300"
            y="-80"
            textAnchor="middle"
            fill="#8888aa"
            fontSize="9"
            fontWeight="600"
          >
            ← Входящие
          </text>
          {incomingNeighbors.map((nb, idx) => {
            const y = -60 + idx * 30;
            const opacity = 0.4;
            return (
              <g key={`in-${idx}`}>
                <rect
                  x="-340"
                  y={y - 8}
                  width="40"
                  height="16"
                  rx="3"
                  fill={layerColor}
                  opacity={opacity}
                  stroke={layerColorLight}
                  strokeWidth="1"
                />
                <text
                  x="-320"
                  y={y + 3}
                  textAnchor="middle"
                  fill="white"
                  fontSize="7"
                  fontWeight="500"
                >
                  Ч{nb.prevChunkIndex + 1}
                </text>
                {/* Линия связи */}
                <line
                  x1="-300"
                  y={y + 3}
                  x2="-200"
                  y2={y + 3}
                  stroke={layerColor}
                  strokeWidth="0.5"
                  opacity={0.3}
                  strokeDasharray="3,2"
                />
              </g>
            );
          })}
        </>
      )}

      {/* Нейроны чанка — центральная сетка */}
      <text
        x="0"
        y="-80"
        textAnchor="middle"
        fill={layerColor}
        fontSize="10"
        fontWeight="600"
      >
        Нейроны чанка
      </text>
      <g
        transform={`translate(${-gridSize / 2}, 0)`}
      >
        {[...Array(rows)].map((_, row) =>
          [...Array(cols)].map((_, col) => {
            const idx = row * cols + col;
            if (idx >= neuronCount) return null;
            return (
              <circle
                key={`n-${idx}`}
                cx={col * (NEURON_SIZE + NEURON_GAP)}
                cy={row * (NEURON_SIZE + NEURON_GAP)}
                r={NEURON_SIZE / 2}
                fill={layerColor}
                opacity={0.3 + (idx / Math.max(1, neuronCount - 1)) * 0.5}
                stroke={layerColorLight}
                strokeWidth="0.5"
              />
            );
          })
        )}
      </g>

      {/* Исходящие связи — в следующий слой */}
      {outgoingNeighbors.length > 0 && (
        <>
          <text
            x="300"
            y="-80"
            textAnchor="middle"
            fill="#8888aa"
            fontSize="9"
            fontWeight="600"
          >
            Исходящие →
          </text>
          {outgoingNeighbors.map((nb, idx) => {
            const y = -60 + idx * 30;
            return (
              <g key={`out-${idx}`}>
                {/* Линия связи */}
                <line
                  x1="200"
                  y={y + 3}
                  x2="300"
                  y2={y + 3}
                  stroke={layerColor}
                  strokeWidth="0.5"
                  opacity={0.3}
                  strokeDasharray="3,2"
                />
                <rect
                  x="300"
                  y={y - 8}
                  width="40"
                  height="16"
                  rx="3"
                  fill={layerColor}
                  opacity="0.4"
                  stroke={layerColorLight}
                  strokeWidth="1"
                />
                <text
                  x="320"
                  y={y + 3}
                  textAnchor="middle"
                  fill="white"
                  fontSize="7"
                  fontWeight="500"
                >
                  Ч{nb.nextChunkIndex + 1}
                </text>
              </g>
            );
          })}
        </>
      )}

      {/* Статистика внизу */}
      <text
        x="0"
        y="140"
        textAnchor="middle"
        fill="#666688"
        fontSize="8"
      >
        Всего в слое: {chunk.size} нейронов • {Math.ceil(chunk.size / 64)} чанков
      </text>
    </g>
  );
});

ChunkDetail.displayName = 'ChunkDetail';

export default ChunkDetail;
