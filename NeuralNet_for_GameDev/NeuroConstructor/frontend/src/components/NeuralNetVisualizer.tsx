/**
 * NeuralNetVisualizer — визуализатор архитектуры нейронной сети на реальных GGUF данных
 *
 * Каждая нейросеть разбита на чанки:
 * - Каждый чанк = 1/10 слоя
 * - Визуализация показывает слои → чанки внутри слоёв → масштабирование
 * - Зум колёсиком (пересчёт размеров), панорамирование перетаскиванием
 * - Hover на чанк → tooltip с информацией
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import GGUFGroup from './GGUFGroup';
import GGUFInfoBar from './GGUFInfoBar';
import {
  GGUF_GROUP_CONFIG,
  type GGUFGroupType,
} from './gguf-layer-config';

// ============================================================================
// Типы
// ============================================================================

interface ArchitectureParams {
  model_family?: string;
  vocab_size?: number;
  hidden_size?: number;
  num_layers?: number;
  num_heads?: number;
  num_kv_heads?: number;
  head_dim?: number;
  max_position_embeddings?: number;
  rope_theta?: number;
}

interface ParameterParams {
  estimated_total_params?: number;
  tensor_count?: number;
  file_size_gb?: number;
}

interface NeuralNetVisualizerProps {
  architecture: ArchitectureParams | undefined | null;
  parameters: ParameterParams | undefined | null;
  compareArchitecture?: ArchitectureParams | null;
}

interface LayerConfig {
  name: string;
  shortName: string;
  realSize: number;
  color: string;
  colorLight: string;
  colorDark: string;
  description: string;
  ggufType: GGUFGroupType;
  activation: string;
}

interface ChunkInfo {
  layerIndex: number;
  chunkIndex: number;
  startNeuron: number;
  endNeuron: number;
  neuronCount: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Константы
// ============================================================================

const DEFAULT_ARCHITECTURE: ArchitectureParams = {
  model_family: 'unknown',
  vocab_size: 30522,
  hidden_size: 768,
  num_layers: 4,
  num_heads: 12,
  num_kv_heads: 12,
  head_dim: 64,
  max_position_embeddings: 512,
  rope_theta: 10000,
};

const CHUNKS_PER_LAYER = 10; // фиксированное число чанков на слой
const BASE_CHUNK_PX = 40; // базовый размер чанка в пикселях при зуме 1x
const LAYER_GAP_PX = 180; // горизонтальный отступ между слоями
const CHUNK_GAP_PX = 2; // отступ между чанками в колонке
const START_X = 120;
const START_Y = 60;

// ============================================================================
// Утилиты
// ============================================================================

const formatNumber = (num: number): string => {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
  return num.toString();
};

const validateArchitecture = (arch: ArchitectureParams | undefined | null): ArchitectureParams => {
  if (!arch || typeof arch !== 'object') return DEFAULT_ARCHITECTURE;
  const validated = { ...DEFAULT_ARCHITECTURE, ...arch };
  validated.num_layers = typeof validated.num_layers === 'number' && validated.num_layers >= 1
    ? validated.num_layers : DEFAULT_ARCHITECTURE.num_layers;
  validated.hidden_size = typeof validated.hidden_size === 'number' && validated.hidden_size >= 1
    ? validated.hidden_size : DEFAULT_ARCHITECTURE.hidden_size;
  validated.vocab_size = typeof validated.vocab_size === 'number' && validated.vocab_size >= 0
    ? validated.vocab_size : DEFAULT_ARCHITECTURE.vocab_size;
  validated.num_heads = typeof validated.num_heads === 'number' && validated.num_heads >= 1
    ? validated.num_heads : DEFAULT_ARCHITECTURE.num_heads;
  validated.head_dim = typeof validated.head_dim === 'number' && validated.head_dim >= 1
    ? validated.head_dim : DEFAULT_ARCHITECTURE.head_dim;
  return validated;
};

// ============================================================================
// Основной компонент
// ============================================================================

export function NeuralNetVisualizer({
  architecture,
  parameters,
  compareArchitecture,
}: NeuralNetVisualizerProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 700 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all'>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const arch = useMemo(() => validateArchitecture(architecture), [architecture]);

  // Toggle compare
  const handleCompareToggle = useCallback(() => {
    setShowCompare(prev => !prev);
  }, []);

  // Завершение загрузки
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // СЛОИ на основе GGUF данных
  const layers: LayerConfig[] = useMemo(() => {
    const vocabSize = Number(arch.vocab_size ?? DEFAULT_ARCHITECTURE.vocab_size);
    const hiddenSize = Number(arch.hidden_size ?? DEFAULT_ARCHITECTURE.hidden_size);
    const numLayers = Number(arch.num_layers ?? DEFAULT_ARCHITECTURE.num_layers);
    const heads = Number(arch.num_heads ?? DEFAULT_ARCHITECTURE.num_heads);
    const headDim = Number(arch.head_dim ?? Math.round(hiddenSize / heads));
    const result: LayerConfig[] = [];

    // Input Layer (токенизатор)
    result.push({
      name: 'Слой ввода (Токенная эмбеддинг)',
      shortName: 'Ввод',
      realSize: vocabSize,
      color: GGUF_GROUP_CONFIG.input.color,
      colorLight: GGUF_GROUP_CONFIG.input.colorLight,
      colorDark: GGUF_GROUP_CONFIG.input.colorDark,
      description: `vocab_size=${formatNumber(vocabSize)} | ${CHUNKS_PER_LAYER} чанков`,
      ggufType: 'input',
      activation: 'linear',
    });

    // Embedding Layer
    result.push({
      name: 'Слой эмбеддингов (Wte + Wpe)',
      shortName: 'Эмбеддинг',
      realSize: hiddenSize,
      color: GGUF_GROUP_CONFIG.embedding.color,
      colorLight: GGUF_GROUP_CONFIG.embedding.colorLight,
      colorDark: GGUF_GROUP_CONFIG.embedding.colorDark,
      description: `hidden_size=${formatNumber(hiddenSize)} | ${CHUNKS_PER_LAYER} чанков`,
      ggufType: 'embedding',
      activation: 'linear',
    });

    // Transformer blocks (из GGUF: block_count)
    for (let i = 0; i < numLayers; i++) {
      result.push({
        name: `Скрытый слой ${i + 1}/${numLayers}`,
        shortName: `С${i + 1}`,
        realSize: hiddenSize,
        color: i % 2 === 0 ? GGUF_GROUP_CONFIG.hidden.color : GGUF_GROUP_CONFIG.hidden.colorLight,
        colorLight: i % 2 === 0 ? GGUF_GROUP_CONFIG.hidden.colorLight : '#ffffff',
        colorDark: i % 2 === 0 ? GGUF_GROUP_CONFIG.hidden.colorDark : '#84cc16',
        description: `${heads} голов × ${headDim} dim | ${formatNumber(hiddenSize)} нейронов | ${CHUNKS_PER_LAYER} чанков`,
        ggufType: 'hidden',
        activation: 'gelu',
      });
    }

    // Output Layer (LM Head)
    result.push({
      name: 'Слой вывода (LM Head)',
      shortName: 'Вывод',
      realSize: vocabSize,
      color: GGUF_GROUP_CONFIG.output.color,
      colorLight: GGUF_GROUP_CONFIG.output.colorLight,
      colorDark: GGUF_GROUP_CONFIG.output.colorDark,
      description: `vocab_size=${formatNumber(vocabSize)} | ${CHUNKS_PER_LAYER} чанков | softmax`,
      ggufType: 'output',
      activation: 'softmax',
    });

    return result;
  }, [arch]);

  // Фильтрация
  const filteredLayers = useMemo(() => {
    let result = layers;
    if (activeFilter !== 'all') {
      result = result.filter(l => l.ggufType === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.shortName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [layers, activeFilter, searchQuery]);

  // Состояние hover на чанк
  const [hoveredChunk, setHoveredChunk] = useState<ChunkInfo | null>(null);

  // Вычисляем позиции ВСЕХ чанков для всех слоёв (размеры зависят от zoom)
  const allChunks = useMemo(() => {
    const chunks: ChunkInfo[] = [];
    const chunkPx = BASE_CHUNK_PX * zoom; // размер чанка зависит от зума
    const gap = CHUNK_GAP_PX * zoom;

    filteredLayers.forEach((layer, li) => {
      // Фиксированное число чанков на слой
      const numChunks = CHUNKS_PER_LAYER;
      const spacing = chunkPx + gap;

      for (let ci = 0; ci < numChunks; ci++) {
        // Равномерно распределяем нейроны по чанкам
        const neuronsPerChunk = Math.ceil(layer.realSize / numChunks);
        const startNeuron = ci * neuronsPerChunk;
        const endNeuron = Math.min(startNeuron + neuronsPerChunk - 1, layer.realSize - 1);
        const neuronCount = endNeuron - startNeuron + 1;

        chunks.push({
          layerIndex: li,
          chunkIndex: ci,
          startNeuron,
          endNeuron,
          neuronCount,
          x: START_X + li * LAYER_GAP_PX,
          y: START_Y + ci * spacing,
          width: chunkPx,
          height: chunkPx,
        });
      }
    });

    return chunks;
  }, [filteredLayers, zoom]);

  // Размеры SVG — фиксированные, без transform scale
  const svgDimensions = useMemo(() => {
    if (allChunks.length === 0) return { width: 800, height: 600 };
    const maxX = Math.max(...allChunks.map(c => c.x + c.width)) + 60;
    const maxY = Math.max(...allChunks.map(c => c.y + c.height)) + 60;
    return { width: maxX, height: maxY };
  }, [allChunks]);

  const zoomIn = useCallback(() => setZoom(prev => Math.min(10, prev + 0.3)), []);
  const zoomOut = useCallback(() => setZoom(prev => Math.max(0.05, prev - 0.3)), []);
  const resetAll = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Зум колёсиком
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom(prev => Math.max(0.05, Math.min(10, prev + delta)));
  }, []);

  // Drag — pan по SVG
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
    setIsDragging(true);
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.isDragging) return;
    const d = dragRef.current;
    setPan({
      x: d.startPanX + (e.clientX - d.startX),
      y: d.startPanY + (e.clientY - d.startY),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current.isDragging = false;
    setIsDragging(false);
  }, []);

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

  // Глобальные обработчики для drag — чтобы работало при выходе за пределы canvas
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return;
      const d = dragRef.current;
      setPan({
        x: d.startPanX + (e.clientX - d.startX),
        y: d.startPanY + (e.clientY - d.startY),
      });
    };
    
    const handleGlobalMouseUp = () => {
      dragRef.current.isDragging = false;
      setIsDragging(false);
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Клавиатурная навигация
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === '/') {
      e.preventDefault();
      setShowSearch(true);
    } else if (e.key === 'Escape') {
      setShowSearch(false);
      setShowExportMenu(false);
    }
  }, []);

  // Экспорт в JSON
  const handleExportJSON = useCallback(() => {
    const data = {
      model_family: arch.model_family,
      architecture: {
        vocab_size: arch.vocab_size,
        hidden_size: arch.hidden_size,
        num_layers: arch.num_layers,
        num_heads: arch.num_heads,
        chunks_per_layer: CHUNKS_PER_LAYER,
      },
      parameters: parameters || {},
      layers: filteredLayers.map((l, i) => ({
        index: i,
        name: l.name,
        neurons: l.realSize,
        chunks: CHUNKS_PER_LAYER,
        chunk_size: Math.ceil(l.realSize / CHUNKS_PER_LAYER),
        gguf_type: l.ggufType,
        activation: l.activation,
      })),
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `architecture-${arch.model_family || 'nn'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [arch, parameters, filteredLayers]);

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div ref={containerRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f' }} role="status">
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #2a2a3e', borderTopColor: '#7c6ff7', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, color: '#8888aa' }}>Загрузка архитектуры...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Общее число чанков и нейронов
  const totalChunks = allChunks.length;
  const totalNeurons = filteredLayers.reduce((sum, l) => sum + l.realSize, 0);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0a0f', userSelect: 'none' }}
      role="application"
      aria-label="Визуализация архитектуры нейронной сети"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ===== Header ===== */}
      <header style={{
        padding: '10px 20px',
        borderBottom: '1px solid #1a1a2e',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#0f0f1a',
        flexShrink: 0,
      }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#e8e8e8', margin: 0 }}>
            🧠 {((arch.model_family || 'unknown').toUpperCase())} — Архитектура GGUF
          </h3>
          <div style={{ fontSize: 11, color: '#8888aa', marginTop: 2 }}>
            {filteredLayers.length} слоёв • {formatNumber(totalNeurons)} нейронов • {totalChunks} чанков •{' '}
            <span style={{ color: '#7c6ff7', fontWeight: 600 }}>
              {parameters?.estimated_total_params ? formatNumber(parameters.estimated_total_params) : 'N/A'} параметров
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Поиск */}
          <button onClick={() => setShowSearch(!showSearch)} style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: showSearch ? '#7c6ff7' : '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 4,
            color: showSearch ? 'white' : '#8888aa', cursor: 'pointer', fontSize: 12,
          }}>🔍</button>
          {/* Экспорт */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowExportMenu(!showExportMenu)} style={{
              width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 4,
              color: '#8888aa', cursor: 'pointer', fontSize: 11,
            }}>📥</button>
            {showExportMenu && (
              <div style={{
                position: 'absolute', top: 30, right: 0, background: '#1a1a2e',
                border: '1px solid #2a2a3e', borderRadius: 6, padding: 4, zIndex: 100,
                minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}>
                <button onClick={handleExportJSON} style={{
                  display: 'block', width: '100%', padding: '6px 10px', background: 'none',
                  border: 'none', color: '#e8e8e8', cursor: 'pointer', fontSize: 11,
                  borderRadius: 4, textAlign: 'left',
                }}>Экспорт JSON</button>
                <button onClick={handleCompareToggle} style={{
                  display: 'block', width: '100%', padding: '6px 10px', background: 'none',
                  border: 'none', color: '#e8e8e8', cursor: 'pointer', fontSize: 11,
                  borderRadius: 4, textAlign: 'left',
                }}>Сравнение {showCompare ? 'выкл' : 'вкл'}</button>
              </div>
            )}
          </div>
          <button onClick={zoomOut} style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 4,
            color: '#ccc', cursor: 'pointer', fontSize: 14, fontWeight: 700,
          }}>−</button>
          <span style={{ fontSize: 10, color: '#8888aa', minWidth: 42, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={zoomIn} style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 4,
            color: '#ccc', cursor: 'pointer', fontSize: 14, fontWeight: 700,
          }}>+</button>
          <button onClick={resetAll} title="Сбросить вид" style={{
            padding: '3px 10px', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 4,
            color: '#8888aa', cursor: 'pointer', fontSize: 11,
          }}>⟲</button>
        </div>
      </header>

      {/* Search overlay */}
      {showSearch && (
        <div style={{
          padding: '8px 20px', borderBottom: '1px solid #1a1a2e', background: '#0f0f1a',
          display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
        }}>
          <input
            autoFocus
            placeholder="Поиск слоя (например: 'transformer', 'embedding')..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              flex: 1, padding: '6px 12px', background: '#121220', border: '1px solid #2a2a3e',
              borderRadius: 6, color: '#e8e8e8', fontSize: 12, outline: 'none',
            }}
          />
          <span style={{ color: '#666688', fontSize: 11 }}>{filteredLayers.length} найдено</span>
        </div>
      )}

      {/* ===== Canvas — SVG ===== */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          cursor: isDragging ? 'move' : 'grab',
          touchAction: 'none',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        role="img"
        aria-label={`Архитектура: ${filteredLayers.length} слоёв, ${totalChunks} чанков`}
      >
        <svg
          width={svgDimensions.width}
          height={svgDimensions.height}
          style={{
            position: 'absolute', top: 0, left: 0,
            transform: `translate(${pan.x}px,${pan.y}px)`,
          }}
        >
          <defs>
            {filteredLayers.map((layer, idx) => (
              <React.Fragment key={idx}>
                <radialGradient id={`chGrad-${idx}`} cx="40%" cy="35%">
                  <stop offset="0%" stopColor={layer.colorLight} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={layer.colorDark} stopOpacity="0.4" />
                </radialGradient>
                <filter id={`glow-${idx}`} x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </React.Fragment>
            ))}
          </defs>

          {/* ===== Связи (рисуем первыми — будут СНИЗУ) ===== */}
          {filteredLayers.length > 1 && filteredLayers.map((_, li) => {
            if (li >= filteredLayers.length - 1) return null;
            const curChunks = allChunks.filter(c => c.layerIndex === li);
            const nxtChunks = allChunks.filter(c => c.layerIndex === li + 1);
            if (curChunks.length === 0 || nxtChunks.length === 0) return null;

            const curColor = filteredLayers[li].color;
            const connections: React.ReactNode[] = [];

            curChunks.forEach((cur) => {
              nxtChunks.forEach((nxt) => {
                const curCx = cur.x + cur.width / 2;
                const curCy = cur.y + cur.height / 2;
                const nxtCx = nxt.x + nxt.width / 2;
                const nxtCy = nxt.y + nxt.height / 2;

                const dx = nxtCx - curCx;
                const dy = nxtCy - curCy;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = dx / len;
                const ny = dy / len;

                const r1 = Math.max(cur.width, cur.height) / 2;
                const r2 = Math.max(nxt.width, nxt.height) / 2;

                const x1 = curCx + nx * r1;
                const y1 = curCy + ny * r1;
                const x2 = nxtCx - nx * r2;
                const y2 = nxtCy - ny * r2;

                // Подсветка связей: если hover-нутый чанк в этом слое или следующем — подсвечиваем связь
                let linkOpacity = 0.12;
                let linkWidth = 0.8;
                if (hoveredChunk) {
                  const isCurChunkHovered = hoveredChunk.layerIndex === li && hoveredChunk.chunkIndex === cur.chunkIndex;
                  const isNxtChunkHovered = hoveredChunk.layerIndex === li + 1 && hoveredChunk.chunkIndex === nxt.chunkIndex;
                  if (isCurChunkHovered || isNxtChunkHovered) {
                    linkOpacity = 0.6;
                    linkWidth = 2;
                  }
                }

                connections.push(
                  <line
                    key={`conn-${li}-${cur.chunkIndex}-${nxt.chunkIndex}`}
                    x1={x1} y1={y1}
                    x2={x2} y2={y2}
                    stroke={curColor}
                    strokeWidth={linkWidth}
                    opacity={linkOpacity}
                  />
                );
              });
            });
            return <g key={`layer-conns-${li}`}>{connections}</g>;
          })}

          {/* ===== Метки номеров слоев над и под чанками ===== */}
          {filteredLayers.map((layer, li) => {
            const layerChunks = allChunks.filter(c => c.layerIndex === li);
            if (layerChunks.length === 0) return null;

            const firstChunk = layerChunks[0];
            const lastChunk = layerChunks[layerChunks.length - 1];
            const layerCenterX = firstChunk.x + (lastChunk.x + lastChunk.width - firstChunk.x) / 2;
            const layerTopY = firstChunk.y - 40;
            const layerBottomY = lastChunk.y + lastChunk.height + 40;

            return (
              <g key={`layer-label-${li}`}>
                {/* Номер слоя над первым чанком */}
                <text
                  x={layerCenterX}
                  y={layerTopY}
                  textAnchor="middle"
                  fill={layer.color}
                  fontSize={10}
                  fontWeight="700"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  Слой {li + 1}
                </text>
                {/* Номер слоя под последним чанком */}
                <text
                  x={layerCenterX}
                  y={layerBottomY}
                  textAnchor="middle"
                  fill={layer.color}
                  fontSize={10}
                  fontWeight="700"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  Слой {li + 1}
                </text>
              </g>
            );
          })}

          {/* ===== Круглые чанки (рисуем последними — будут СВЕРХУ связей) ===== */}
          {allChunks.map((chunk) => {
            const layer = filteredLayers[chunk.layerIndex];
            if (!layer) return null;

            const radius = Math.max(chunk.width, chunk.height) / 2;
            const cx = chunk.x + chunk.width / 2;
            const cy = chunk.y + chunk.height / 2;
            const isHovered = hoveredChunk?.layerIndex === chunk.layerIndex && hoveredChunk?.chunkIndex === chunk.chunkIndex;

            // Прозрачность фона чанка
            const bgOpacity = isHovered ? 1 : 0.85;
            const strokeWidth = isHovered ? 3 : 1;

            return (
              <g
                key={`c-${chunk.layerIndex}-${chunk.chunkIndex}`}
                onMouseEnter={() => setHoveredChunk(chunk)}
                onMouseLeave={() => setHoveredChunk(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Основной круг чанка */}
                <circle
                  cx={cx} cy={cy}
                  r={radius}
                  fill={layer.color}
                  stroke={isHovered ? '#ffffff' : layer.color}
                  strokeWidth={strokeWidth}
                  opacity={bgOpacity}
                />
                {/* Внутренний светлый круг — объём */}
                <circle
                  cx={cx} cy={cy}
                  r={radius * 0.72}
                  fill={layer.colorLight}
                  opacity={isHovered ? 0.35 : 0.12}
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip при hover на чанк */}
        {hoveredChunk && (() => {
          const layer = filteredLayers[hoveredChunk.layerIndex];
          if (!layer) return null;
          const neuronsPerChunk = Math.ceil(layer.realSize / CHUNKS_PER_LAYER);
          return (
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                background: 'rgba(10, 10, 15, 0.95)',
                border: `1px solid ${layer.color}`,
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 11,
                color: '#e8e8e8',
                pointerEvents: 'none',
                zIndex: 100,
                boxShadow: `0 0 16px ${layer.color}33`,
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 12, color: layer.color, marginBottom: 4 }}>
                {layer.name}
              </div>
              <div>Чанк: {hoveredChunk.chunkIndex + 1} / {CHUNKS_PER_LAYER}</div>
              <div>Нейроны: #{hoveredChunk.startNeuron} — #{hoveredChunk.endNeuron} ({hoveredChunk.neuronCount})</div>
              <div style={{ color: '#8888aa', fontSize: 10, marginTop: 2 }}>
                Слой {hoveredChunk.layerIndex + 1} • {neuronsPerChunk} нейронов/чанк
              </div>
            </div>
          );
        })()}
      </div>

      <div style={{
        position: 'absolute', bottom: 8, left: 12, padding: '4px 10px',
        background: 'rgba(18,18,32,0.85)', border: '1px solid #2a2a3e',
        borderRadius: 4, fontSize: 10, color: '#666688', pointerEvents: 'none',
      }}>
        {showSearch ? 'ESC закрыть поиск' : 'Нажмите / для поиска'}
      </div>

      {/* ===== GGUF Info Bar ===== */}
      <GGUFInfoBar
        layers={filteredLayers}
        architecture={arch}
        parameters={parameters || {}}
      />
    </div>
  );
}
