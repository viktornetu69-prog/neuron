/**
 * ChunkCanvas — интерактивная карта нейронной сети в чанковой системе
 * 
 * Полноценная навигация по нейронке:
 * - Зум колёсиком мыши
 * - Панорамирование перетаскиванием
 * - Слои расположены вертикально
 * - Каждый слой — горизонтальная полоса чанков
 * - При зуме видны нейроны и связи внутри чанков
 * - При отзуме видна структура слоёв
 * - Цвет связей = знак веса, толщина = |вес|
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { createChunkManager, type ChunkData } from './ChunkManager';

interface ChunkCanvasProps {
  architecture: {
    model_family?: string;
    vocab_size?: number;
    hidden_size?: number;
    num_layers?: number;
    num_heads?: number;
    head_dim?: number;
  } | undefined | null;
  onBack: () => void;
}

// Константы визуализации
const NEURON_RADIUS = 4;
const NEURON_SPACING = 12; // расстояние между нейронами в чанке
const CHUNK_SIZE = 64; // нейронов в чанке
const GRID_COLS = 8; // 8×8 = 64 нейрона
const GRID_ROWS = 8;
const LAYER_HEIGHT = 120; // высота слоя в пикселях
const LAYER_GAP = 80; // отступ между слоями

// Цвета
const COLORS = {
  bg: '#0a0a0f',
  neuron: '#7c6ff7',
  neuronHover: '#ffffff',
  connectionPos: '#10b981',
  connectionNeg: '#ef4444',
  text: '#e8e8e8',
  textDim: '#666688',
  gridLine: '#1a1a2e',
  border: '#2a2a3e',
  zoom: '#121220',
  zoomActive: '#7c6ff7',
};

interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

interface PanState {
  isPanning: boolean;
  startX: number;
  startY: number;
  startCamX: number;
  startCamY: number;
}

// Форматирование чисел
const formatNumber = (num: number): string => {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
  return num.toString();
};

export const ChunkCanvas: React.FC<ChunkCanvasProps> = ({ architecture, onBack }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<PanState>({ isPanning: false, startX: 0, startY: 0, startCamX: 0, startCamY: 0 });
  
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, zoom: 1 });
  const [hoveredNeuron, setHoveredNeuron] = useState<{
    layerIndex: number;
    chunkIndex: number;
    neuronIndex: number;
    info: { weight?: number; activation?: number };
  } | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 });

  // Подготовка архитектуры
  const arch = useMemo(() => {
    if (!architecture || typeof architecture !== 'object') return null;
    return {
      model_family: (architecture as any).model_family || 'unknown',
      vocab_size: Number((architecture as any).vocab_size || 30522),
      hidden_size: Number((architecture as any).hidden_size || 768),
      num_layers: Number((architecture as any).num_layers || 12),
      num_heads: Number((architecture as any).num_heads || 12),
      head_dim: Number((architecture as any).head_dim || 64),
    };
  }, [architecture]);

  // Создание слоёв
  const layers = useMemo(() => {
    if (!arch) return [];
    const result: Array<{
      name: string;
      shortName: string;
      realSize: number;
      color: string;
      colorLight: string;
      colorDark: string;
      ggufType: string;
    }> = [];

    // Input
    result.push({
      name: 'Input Layer',
      shortName: 'Вход',
      realSize: arch.vocab_size,
      color: '#ef4444',
      colorLight: '#f87171',
      colorDark: '#b91c1c',
      ggufType: 'input',
    });

    // Embedding
    result.push({
      name: 'Embedding Layer',
      shortName: 'Встраивания',
      realSize: arch.hidden_size,
      color: '#f97316',
      colorLight: '#fb923c',
      colorDark: '#c2410c',
      ggufType: 'embedding',
    });

    // Transformer blocks
    for (let i = 0; i < arch.num_layers; i++) {
      result.push({
        name: `Transformer Block ${i + 1}/${arch.num_layers}`,
        shortName: `B${i + 1}`,
        realSize: arch.hidden_size,
        color: i % 2 === 0 ? '#84cc16' : '#a3e635',
        colorLight: i % 2 === 0 ? '#a3e635' : '#bef264',
        colorDark: i % 2 === 0 ? '#65a30d' : '#4d7c0f',
        ggufType: 'hidden',
      });
    }

    // Output
    result.push({
      name: 'Output Layer',
      shortName: 'Выход',
      realSize: arch.vocab_size,
      color: '#10b981',
      colorLight: '#34d399',
      colorDark: '#047857',
      ggufType: 'output',
    });

    return result;
  }, [arch]);

  // Создание ChunkManager
  const chunkManager = useMemo(() => {
    if (layers.length === 0) return null;
    return createChunkManager(
      layers.map(l => ({
        name: l.name,
        realSize: l.realSize,
        color: l.color,
        colorLight: l.colorLight,
        colorDark: l.colorDark,
      }))
    );
  }, [layers]);

  // Вычисление позиций слоёв
  const layerLayout = useMemo(() => {
    if (layers.length === 0) return [];
    const result: Array<{ y: number; chunkCount: number }> = [];
    let currentY = 0;

    for (let i = 0; i < layers.length; i++) {
      const chunkCount = Math.ceil(layers[i].realSize / CHUNK_SIZE);
      result.push({ y: currentY, chunkCount });
      currentY += LAYER_HEIGHT + LAYER_GAP;
    }

    return result;
  }, [layers]);

  // Обработка зума
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.05, Math.min(10, prev.zoom + delta)),
    }));
  }, []);

  // Обработка панорамирования
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      panRef.current = {
        isPanning: true,
        startX: e.clientX,
        startY: e.clientY,
        startCamX: camera.x,
        startCamY: camera.y,
      };
    }
  }, [camera]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pan = panRef.current;
    if (pan.isPanning) {
      setCamera(prev => ({
        ...prev,
        x: pan.startCamX + (e.clientX - pan.startX),
        y: pan.startCamY + (e.clientY - pan.startY),
      }));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    panRef.current.isPanning = false;
  }, []);

  // Обработка resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setContainerSize({ width: clientWidth, height: clientHeight });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Начальная центровка
  useEffect(() => {
    if (layerLayout.length > 0 && camera.x === 0 && camera.y === 0) {
      const totalHeight = layerLayout[layerLayout.length - 1].y + LAYER_HEIGHT;
      setCamera({
        x: 0,
        y: -totalHeight / 2 + containerSize.height / 2,
        zoom: Math.min(1, containerSize.width / (CHUNK_SIZE * NEURON_SPACING * 2)),
      });
    }
  }, [layerLayout, containerSize, camera.x, camera.y]);

  // Отрисовка чанка
  const renderChunk = useCallback((chunk: ChunkData, layerColor: string, layerColorLight: string) => {
    const layerLayoutItem = layerLayout[chunk.layerIndex];
    if (!layerLayoutItem) return null;

    const layerY = layerLayoutItem.y;
    const chunkX = chunk.chunkIndex * (GRID_COLS * NEURON_SPACING);

    // Проверка видимости чанка
    const chunkScreenX = (chunkX + camera.x);
    const chunkScreenY = (layerY + camera.y);
    const chunkScreenW = GRID_COLS * NEURON_SPACING;
    const chunkScreenH = GRID_ROWS * NEURON_SPACING;

    // Определяем какие нейроны видны
    const neurons: React.ReactNode[] = [];
    const connections: React.ReactNode[] = [];

    // Генерируем нейроны
    chunk.neurons.forEach((neuron, idx) => {
      if (idx >= GRID_ROWS * GRID_COLS) return;

      const col = idx % GRID_COLS;
      const row = Math.floor(idx / GRID_COLS);
      const x = chunkX + col * NEURON_SPACING;
      const y = layerY + row * NEURON_SPACING;

      // Цвет нейрона по весу
      let fillColor = layerColor;
      if (neuron.weight !== undefined) {
        if (neuron.weight > 0.3) fillColor = COLORS.connectionPos;
        else if (neuron.weight < -0.3) fillColor = COLORS.connectionNeg;
      }

      neurons.push(
        <circle
          key={`n-${idx}`}
          cx={x}
          cy={y}
          r={NEURON_RADIUS}
          fill={fillColor}
          opacity={0.5 + (neuron.activation || 0.5) * 0.5}
          stroke={layerColorLight}
          strokeWidth="0.5"
          style={{
            cursor: 'pointer',
            transition: 'r 0.15s ease',
          }}
          onMouseEnter={() => setHoveredNeuron({
            layerIndex: chunk.layerIndex,
            chunkIndex: chunk.chunkIndex,
            neuronIndex: neuron.index,
            info: { weight: neuron.weight, activation: neuron.activation },
          })}
          onMouseLeave={() => setHoveredNeuron(null)}
        />
      );

      // Внутренние связи (с предыдущим нейроном)
      if (col > 0 && idx < GRID_ROWS * GRID_COLS) {
        connections.push(
          <line
            key={`h-${idx}`}
            x1={x - NEURON_SPACING}
            y1={y}
            x2={x}
            y2={y}
            stroke={layerColor}
            strokeWidth="0.3"
            opacity="0.1"
          />
        );
      }
      if (row > 0 && idx >= GRID_COLS) {
        connections.push(
          <line
            key={`v-${idx}`}
            x1={x}
            y1={y - NEURON_SPACING}
            x2={x}
            y2={y}
            stroke={layerColor}
            strokeWidth="0.3"
            opacity="0.1"
          />
        );
      }
    });

    // Входящие связи (с предыдущего чанка)
    chunk.incomingWeights?.forEach((iw) => {
      const prevChunkX = iw.fromChunk * (GRID_COLS * NEURON_SPACING);
      const prevLayerY = layerLayout[chunk.layerIndex - 1]?.y ?? layerY;

      // Связи с предыдущим слоем
      iw.weights.slice(0, 8).forEach((w, idx) => {
        const fromX = prevChunkX + (idx % 4) * (NEURON_SPACING * 2);
        const fromY = prevLayerY + Math.floor(idx / 4) * NEURON_SPACING;
        const toX = chunkX + (idx % 4) * (NEURON_SPACING * 2);
        const toY = layerY + Math.floor(idx / 4) * NEURON_SPACING;

        connections.push(
          <line
            key={`inc-${iw.fromChunk}-${idx}`}
            x1={fromX}
            y1={fromY}
            x2={toX}
            y2={toY}
            stroke={w > 0 ? COLORS.connectionPos : COLORS.connectionNeg}
            strokeWidth={Math.abs(w) * 1.5}
            opacity="0.2"
          />
        );
      });
    });

    // Исходящие связи (в следующий чанк)
    chunk.outgoingWeights?.forEach((ow) => {
      const nextLayerY = layerLayout[chunk.layerIndex + 1]?.y ?? layerY + LAYER_HEIGHT + LAYER_GAP;

      ow.weights.slice(0, 8).forEach((w, idx) => {
        const fromX = chunkX + (idx % 4) * (NEURON_SPACING * 2);
        const fromY = layerY + Math.floor(idx / 4) * NEURON_SPACING;
        const toX = ow.toChunk * (GRID_COLS * NEURON_SPACING) + (idx % 4) * (NEURON_SPACING * 2);
        const toY = nextLayerY + Math.floor(idx / 4) * NEURON_SPACING;

        connections.push(
          <line
            key={`out-${ow.toChunk}-${idx}`}
            x1={fromX}
            y1={fromY}
            x2={toX}
            y2={toY}
            stroke={w > 0 ? COLORS.connectionPos : COLORS.connectionNeg}
            strokeWidth={Math.abs(w) * 1.5}
            opacity="0.2"
          />
        );
      });
    });

    return (
      <g key={`chunk-${chunk.layerIndex}-${chunk.chunkIndex}`}>
        {connections}
        {neurons}
      </g>
    );
  }, [camera, layerLayout]);

  // Отрисовка слоёв
  const renderLayer = useCallback((layerIndex: number) => {
    const layer = layers[layerIndex];
    if (!layer) return null;

    const layerLayoutItem = layerLayout[layerIndex];
    if (!layerLayoutItem) return null;

    const chunkCount = layerLayoutItem.chunkCount;
    // Загружаем и рендерим чанки
    if (!chunkManager) return null;

    const chunks: React.ReactNode[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunk = chunkManager.loadChunk(layerIndex, i);
      if (chunk) {
        chunks.push(renderChunk(chunk, layer.color, layer.colorLight));
      }
    }

    return (
      <g key={`layer-${layerIndex}`}>
        {/* Линия-разделитель слоя */}
        <line
          x1={-20}
          y1={layerLayoutItem.y - 20}
          x2={chunkCount * GRID_COLS * NEURON_SPACING + 20}
          y2={layerLayoutItem.y - 20}
          stroke={layer.color}
          strokeWidth="0.5"
          opacity="0.3"
        />
        {/* Подпись слоя */}
        <text
          x={-30}
          y={layerLayoutItem.y + GRID_ROWS * NEURON_SPACING / 2 + 4}
          textAnchor="end"
          fill={layer.color}
          fontSize="10"
          fontWeight="600"
        >
          {layer.shortName}
        </text>
        {chunks}
      </g>
    );
  }, [layers, layerLayout, chunkManager, renderChunk]);

  // Общая ширина и высота
  const totalWidth = useMemo(() => {
    if (layers.length === 0) return 0;
    const lastLayer = layers[layers.length - 1];
    const lastChunkCount = Math.ceil(lastLayer.realSize / CHUNK_SIZE);
    return lastChunkCount * GRID_COLS * NEURON_SPACING + 100;
  }, [layers]);

  const totalHeight = useMemo(() => {
    return layerLayout.length > 0
      ? layerLayout[layerLayout.length - 1].y + LAYER_HEIGHT + 50
      : 500;
  }, [layerLayout]);

  if (!arch) return null;

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: COLORS.bg,
      }}
    >
      {/* Верхняя панель */}
      <div
        style={{
          padding: '8px 16px',
          borderBottom: `1px solid ${COLORS.border}`,
          background: '#0f0f1a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 14, color: COLORS.text, fontWeight: 600 }}>
            🧠 {arch.model_family?.toUpperCase()} — Chunk Map
          </h3>
          <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 2 }}>
            {layers.length} слоёв • {layers.reduce((s, l) => s + Math.ceil(l.realSize / CHUNK_SIZE), 0)} чанков •
            Зум: колёсико • Пан: перетаскивание
          </div>
        </div>
        <button
          onClick={onBack}
          style={{
            padding: '4px 12px',
            background: COLORS.zoom,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 4,
            color: COLORS.textDim,
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          ← Назад
        </button>
      </div>

      {/* SVG Canvas */}
      <div
        style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width={containerSize.width}
          height={containerSize.height}
          style={{
            cursor: panRef.current.isPanning ? 'grabbing' : 'grab',
          }}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g transform={`translate(${camera.x},${camera.y}) scale(${camera.zoom})`}>
            {/* Сетка */}
            <g opacity="0.1">
              {[...Array(50)].map((_, i) => (
                <React.Fragment key={`grid-${i}`}>
                  <line x1={i * 100} y1={0} x2={i * 100} y2={totalHeight} stroke={COLORS.gridLine} strokeWidth="0.5" />
                  <line x1={0} y1={i * 100} x2={totalWidth} y2={i * 100} stroke={COLORS.gridLine} strokeWidth="0.5" />
                </React.Fragment>
              ))}
            </g>

            {/* Слои */}
            {layers.map((_, i) => renderLayer(i))}
          </g>
        </svg>

        {/* Tooltip нейрона */}
        {hoveredNeuron && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              background: 'rgba(10, 10, 15, 0.95)',
              border: `1px solid ${layers[hoveredNeuron.layerIndex]?.color || COLORS.neuron}`,
              borderRadius: 8,
              padding: 12,
              fontSize: 10,
              color: COLORS.text,
              pointerEvents: 'none',
              zIndex: 100,
              minWidth: 200,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 11 }}>
              {layers[hoveredNeuron.layerIndex]?.name}
            </div>
            <div>Чанк: {hoveredNeuron.chunkIndex + 1}</div>
            <div>Нейрон: #{hoveredNeuron.neuronIndex}</div>
            <div style={{ color: hoveredNeuron.info.weight && hoveredNeuron.info.weight > 0 ? COLORS.connectionPos : COLORS.connectionNeg }}>
              Вес: {hoveredNeuron.info.weight?.toFixed(3) ?? 'N/A'}
            </div>
            <div style={{ color: '#fbbf24' }}>
              Активация: {hoveredNeuron.info.activation?.toFixed(3) ?? 'N/A'}
            </div>
          </div>
        )}

        {/* Зум-контрол */}
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <button
            onClick={() => setCamera(prev => ({ ...prev, zoom: Math.min(10, prev.zoom + 0.2) }))}
            style={{
              width: 28,
              height: 28,
              background: COLORS.zoom,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 4,
              color: COLORS.text,
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            +
          </button>
          <div
            style={{
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: COLORS.zoom,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 4,
              color: COLORS.textDim,
              fontSize: 9,
            }}
          >
            {Math.round(camera.zoom * 100)}%
          </div>
          <button
            onClick={() => setCamera(prev => ({ ...prev, zoom: Math.max(0.05, prev.zoom - 0.2) }))}
            style={{
              width: 28,
              height: 28,
              background: COLORS.zoom,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 4,
              color: COLORS.text,
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            −
          </button>
          <button
            onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
            style={{
              width: 28,
              height: 28,
              background: COLORS.zoom,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 4,
              color: COLORS.text,
              cursor: 'pointer',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ⟲
          </button>
        </div>

        {/* Легенда */}
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            background: 'rgba(10, 10, 15, 0.9)',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: 8,
            fontSize: 9,
            color: COLORS.textDim,
          }}
        >
          <div style={{ marginBottom: 4, fontWeight: 600, color: COLORS.text }}>Легенда</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.connectionPos }} />
            Положительный вес
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.connectionNeg }} />
            Отрицательный вес
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.neuron }} />
            Нейрон (размер = активация)
          </div>
        </div>
      </div>
    </div>
  );
};
