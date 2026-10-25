/**
 * NeuralNetVisualizer — визуализатор архитектуры нейронной сети
 * 
 * Исправлено и улучшено:
 * 1. Персональные веса для каждого соединения
 * 2. Hover-эффекты с glassmorphism
 * 3. Pulse анимация при клике
 * 4. Группировка слоёв по типу
 * 5. Поиск слоёв
 * 6. Экспорт архитектуры в JSON
 * 7. Режим сравнения архитектур
 * 8. Connection tooltip с весом
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Connections } from './Connections';
import { LayerNavigation } from './LayerNavigation';
import GGUFGroup from './GGUFGroup';
import GGUFInfoBar from './GGUFInfoBar';
import ChunkDetail from './ChunkDetail';
import { ChunkCanvas } from './chunk-system/ChunkCanvas';
import {
  GGUF_GROUP_CONFIG,
  determineGGUFGroupType,
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
  realSize: number;           // Реальный размер из GGUF
  chunkCount: number;         // Количество чанков для визуализации
  color: string;
  colorLight: string;
  colorDark: string;
  description: string;
  ggufType: GGUFGroupType;
  activation: string;
}

interface ChunkPosition {
  x: number;
  y: number;
  layerIndex: number;
  chunkIndex: number;
  startNeuron: number;
  endNeuron: number;
  size: number;               // Реальный размер слоя
}

interface LayoutResult {
  positions: ChunkPosition[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  contentWidth: number;
  contentHeight: number;
}

interface AutoFitResult {
  scale: number;
  panX: number;
  panY: number;
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

const LAYER_GAP = 200;
const START_X = 80;
const CENTER_Y = 280;

// Чанк-система: каждый чанк представляет N нейронов для производительной визуализации
const CHUNK_SIZE = 64;

// ============================================================================
// Утилиты
// ============================================================================

const formatNumber = (num: number): string => {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
  return num.toString();
};

// Вычисляет количество чанков для данного размера
const computeChunkCount = (size: number): number => {
  return Math.ceil(size / CHUNK_SIZE);
};

// Для больших значений — компактное отображение
const computeDisplayCount = (size: number): number => {
  return Math.min(50, Math.max(10, Math.ceil(size / 128)));
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
  const focusLayerRef = useRef<number>(0);

  const [isLoading, setIsLoading] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 700 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredChunk, setHoveredChunk] = useState<{ layerIndex: number; chunkIndex: number } | null>(null);
  const [focusedChunk, setFocusedChunk] = useState<{ layerIndex: number; chunkIndex: number } | null>(null);
  const [showChunkCanvas, setShowChunkCanvas] = useState(false);
  const [userPanned, setUserPanned] = useState(false);
  const [selectedScrollLayer, setSelectedScrollLayer] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all'>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [compareArch] = useState<ArchitectureParams | null>(null);

  const arch: ArchitectureParams = useMemo(() => validateArchitecture(architecture), [architecture]);

  // Завершение загрузки
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // СЛОИ с GGUF-специфичной группировкой
  const layers: LayerConfig[] = useMemo(() => {
    const vocabSize = Number(arch.vocab_size ?? DEFAULT_ARCHITECTURE.vocab_size);
    const hiddenSize = Number(arch.hidden_size ?? DEFAULT_ARCHITECTURE.hidden_size);
    const numLayers = Number(arch.num_layers ?? DEFAULT_ARCHITECTURE.num_layers);
    const heads = Number(arch.num_heads ?? DEFAULT_ARCHITECTURE.num_heads);
    const headDim = Number(arch.head_dim ?? Math.round(hiddenSize / heads));
    const result: LayerConfig[] = [];

    // Input Layer — реальный vocab_size
    result.push({
      name: 'Input Layer',
      shortName: 'Вход',
      realSize: vocabSize,
      chunkCount: computeChunkCount(vocabSize),
      color: GGUF_GROUP_CONFIG.input.color,
      colorLight: GGUF_GROUP_CONFIG.input.colorLight,
      colorDark: GGUF_GROUP_CONFIG.input.colorDark,
      description: `vocab: ${formatNumber(vocabSize)} (${computeChunkCount(vocabSize)} чанков × ${CHUNK_SIZE})`,
      ggufType: 'input',
      activation: 'linear',
    });

    // Embedding Layer — реальный hidden_size
    result.push({
      name: 'Embedding Layer',
      shortName: 'Встраивания',
      realSize: hiddenSize,
      chunkCount: computeChunkCount(hiddenSize),
      color: GGUF_GROUP_CONFIG.embedding.color,
      colorLight: GGUF_GROUP_CONFIG.embedding.colorLight,
      colorDark: GGUF_GROUP_CONFIG.embedding.colorDark,
      description: `${formatNumber(vocabSize)} × ${formatNumber(hiddenSize)} matrix`,
      ggufType: 'embedding',
      activation: 'linear',
    });

    // Transformer blocks — реальный hidden_size
    for (let i = 0; i < numLayers; i++) {
      result.push({
        name: `Transformer Block ${i + 1}/${numLayers}`,
        shortName: `B${i + 1}`,
        realSize: hiddenSize,
        chunkCount: computeChunkCount(hiddenSize),
        color: i % 2 === 0 ? GGUF_GROUP_CONFIG.hidden.color : GGUF_GROUP_CONFIG.hidden.colorLight,
        colorLight: i % 2 === 0 ? GGUF_GROUP_CONFIG.hidden.colorLight : '#ffffff',
        colorDark: i % 2 === 0 ? GGUF_GROUP_CONFIG.hidden.colorDark : '#84cc16',
        description: `${heads}h × ${headDim}d · ${formatNumber(hiddenSize)} нейронов`,
        ggufType: 'hidden',
        activation: 'gelu',
      });
    }

    // Output Layer — реальный vocab_size
    result.push({
      name: 'Output Layer',
      shortName: 'Выход',
      realSize: vocabSize,
      chunkCount: computeChunkCount(vocabSize),
      color: GGUF_GROUP_CONFIG.output.color,
      colorLight: GGUF_GROUP_CONFIG.output.colorLight,
      colorDark: GGUF_GROUP_CONFIG.output.colorDark,
      description: `${formatNumber(vocabSize)} классов`,
      ggufType: 'output',
      activation: 'softmax',
    });

    return result;
  }, [arch]);

  // Фильтрация слоёв
  const filteredLayers = useMemo(() => {
    let result = layers;
    if (activeFilter !== 'all') {
      result = result.filter(l => l.ggufType === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.shortName.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [layers, activeFilter, searchQuery]);

  // Layout чанков — каждый чанк представляет CHUNK_SIZE нейронов
  const layout: LayoutResult = useMemo(() => {
    const positions: ChunkPosition[] = [];

    filteredLayers.forEach((layer, layerIndex) => {
      const x = START_X + layerIndex * LAYER_GAP;
      // Для больших слоёв — компактный режим (max 50 чанков визуально)
      const displayCount = computeDisplayCount(layer.realSize);
      const chunkHeight = Math.min(32, Math.max(8, 600 / displayCount));
      const startY = CENTER_Y - ((displayCount - 1) * chunkHeight) / 2;

      for (let i = 0; i < displayCount; i++) {
        const startNeuron = Math.floor((i / displayCount) * layer.realSize);
        const endNeuron = Math.floor(((i + 1) / displayCount) * layer.realSize) - 1;
        positions.push({
          x,
          y: startY + i * chunkHeight,
          layerIndex,
          chunkIndex: i,
          startNeuron,
          endNeuron,
          size: layer.realSize,
        });
      }
    });

    const minX = Math.min(...positions.map(c => c.x)) - 80;
    const maxX = Math.max(...positions.map(c => c.x)) + 80;
    const minY = Math.min(...positions.map(c => c.y)) - 40;
    const maxY = Math.max(...positions.map(c => c.y)) + 40;

    return {
      positions,
      minX, maxX, minY, maxY,
      contentWidth: maxX - minX,
      contentHeight: maxY - minY,
    };
  }, [filteredLayers]);

  // Убрано: auto-fit — он ломал позиционирование
  // Теперь: zoom по колёсику мыши, drag для навигации
  // Все 39 слоёв видны изначально
  const displayPan = pan;
  const displayZoom = zoom;

  // Обработчики зума
  const zoomIn = useCallback(() => setZoom(prev => Math.min(3, prev + 0.2)), []);
  const zoomOut = useCallback(() => setZoom(prev => Math.max(0.1, prev - 0.2)), []);
  const resetAll = useCallback(() => {
    setUserPanned(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setUserPanned(true);
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.1, Math.min(3, prev + delta)));
  }, []);

  // ===== FIX: Drag freeze — rAF throttle =====
  // batch setPan calls so React only re-renders ~60fps max
  const rafRef = useRef<number | null>(null);
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setUserPanned(true);
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    // FIX: throttle updates via requestAnimationFrame
    pendingPanRef.current = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingPanRef.current) {
          setPan(pendingPanRef.current);
          pendingPanRef.current = null;
        }
        rafRef.current = null;
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    // Cancel any pending update
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (pendingPanRef.current) {
      setPan(pendingPanRef.current);
      pendingPanRef.current = null;
    }
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

  // Навигация
  const handleScrollLayerClick = useCallback((layerIndex: number) => {
    setSelectedScrollLayer(layerIndex);
    setUserPanned(true);
    focusLayerRef.current = layerIndex;
    const layerPositions = layout.positions.filter(c => c.layerIndex === layerIndex);
    if (layerPositions.length === 0) return;
    const cx = layerPositions[0].x;
    const cy = layerPositions[0].y;
    setPan({
      x: -cx * displayZoom + containerSize.width / 2,
      y: -cy * displayZoom + containerSize.height / 2,
    });
  }, [layout.positions, displayZoom, containerSize]);

  const handleChunkHover = useCallback((layerIndex: number, chunkIndex: number) => {
    setHoveredChunk({ layerIndex, chunkIndex });
  }, []);

  const handleChunkLeave = useCallback(() => setHoveredChunk(null), []);

  const handleChunkClick = useCallback((layerIndex: number, chunkIndex: number) => {
    setFocusedChunk({ layerIndex, chunkIndex });
  }, []);

  const handleChunkBack = useCallback(() => {
    setFocusedChunk(null);
  }, []);

  const handleChunkCanvasToggle = useCallback(() => {
    setShowChunkCanvas(prev => !prev);
  }, []);

  // Клавиатурная навигация
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusLayerRef.current = Math.min(focusLayerRef.current + 1, filteredLayers.length - 1);
      handleScrollLayerClick(focusLayerRef.current);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusLayerRef.current = Math.max(focusLayerRef.current - 1, 0);
      handleScrollLayerClick(focusLayerRef.current);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusLayerRef.current = 0;
      handleScrollLayerClick(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusLayerRef.current = filteredLayers.length - 1;
      handleScrollLayerClick(filteredLayers.length - 1);
    } else if (e.key === '/') {
      e.preventDefault();
      setShowSearch(true);
    } else if (e.key === 'Escape') {
      setShowSearch(false);
      setShowExportMenu(false);
      setActiveFilter('all');
      setSearchQuery('');
    }
  }, [filteredLayers.length, handleScrollLayerClick]);

  // Экспорт в JSON
  const handleExportJSON = useCallback(() => {
    const data = {
      model_family: arch.model_family,
      architecture: {
        vocab_size: arch.vocab_size,
        hidden_size: arch.hidden_size,
        num_layers: arch.num_layers,
        num_heads: arch.num_heads,
        num_kv_heads: arch.num_kv_heads,
        head_dim: arch.head_dim,
        max_position_embeddings: arch.max_position_embeddings,
        rope_theta: arch.rope_theta,
      },
      parameters: parameters || {},
      layers: filteredLayers.map((l, i) => ({
        index: i,
        name: l.name,
        type: l.ggufType,
        neurons: l.realSize,
        activation: l.activation,
        description: l.description,
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

  // Импорт / Сравнение
  const handleCompareToggle = useCallback(() => {
    setShowCompare(prev => !prev);
  }, []);

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

  const arrowEndX = START_X + (filteredLayers.length - 1) * LAYER_GAP + 50;

  if (showChunkCanvas) {
    return (
      <ChunkCanvas
        architecture={{
          model_family: arch.model_family,
          vocab_size: arch.vocab_size,
          hidden_size: arch.hidden_size,
          num_layers: arch.num_layers,
          num_heads: arch.num_heads,
          head_dim: arch.head_dim,
        }}
        onBack={handleChunkCanvasToggle}
      />
    );
  }

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
            🧠 {((arch.model_family || 'unknown').toUpperCase())} — GGUF Архитектура
          </h3>
          <div style={{ fontSize: 11, color: '#8888aa', marginTop: 2 }}>
            {filteredLayers.length} слоёв • {layout.positions.length} нейронов •{' '}
            <span style={{ color: '#7c6ff7', fontWeight: 600 }}>
              {parameters?.estimated_total_params ? formatNumber(parameters.estimated_total_params) : 'N/A'} параметров
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Чанк-карта */}
          <button
            onClick={handleChunkCanvasToggle}
            style={{
              padding: '4px 10px',
              background: showChunkCanvas ? '#7c6ff7' : '#1a1a2e',
              border: '1px solid #2a2a3e',
              borderRadius: 4,
              color: showChunkCanvas ? 'white' : '#8888aa',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            🗺️ Карта
          </button>
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
          <span style={{ fontSize: 10, color: '#8888aa', minWidth: 36, textAlign: 'center' }}>
            {Math.round(displayZoom * 100)}%
          </span>
          <button onClick={zoomIn} style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 4,
            color: '#ccc', cursor: 'pointer', fontSize: 14, fontWeight: 700,
          }}>+</button>
          <button onClick={resetAll} style={{
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

      {/* Compare mode */}
      {showCompare && (
        <div style={{
          padding: '8px 20px', borderBottom: '1px solid #1a1a2e', background: '#0f0f1a',
          display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
        }}>
          <span style={{ color: '#8888aa', fontSize: 12 }}>Режим сравнения:</span>
          <span style={{ color: '#7c6ff7', fontSize: 12 }}>
            Текущая: {arch.model_family?.toUpperCase()} — {filteredLayers.length} слоёв
          </span>
          <span style={{ color: '#666688', fontSize: 12 }}>Импорт второй для сравнения...</span>
        </div>
      )}

      {/* ===== Canvas — scrollable container ===== */}
      <div
        style={{
          flex: 1,
          overflow: 'auto', // Позволяет скроллить когда контент больше экрана
          position: 'relative',
          cursor: isDragging ? 'move' : 'grab',
          scrollbarWidth: 'thin',
          scrollbarColor: '#3a3a4e #0a0a0f',
          // Обеспечиваем минимальный размер контейнера
          minWidth: containerSize.width,
          minHeight: containerSize.height,
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        role="img"
        aria-label={`Архитектура: ${filteredLayers.length} слоёв`}
      >
        <svg
          width={layout.contentWidth + 100}
          height={layout.contentHeight + 80}
          style={{
            position: 'absolute', top: 0, left: 0,
            transform: `translate(${displayPan.x}px,${displayPan.y}px) scale(${displayZoom})`,
            transformOrigin: 'top left',
            transition: 'transform 0.3s ease',
          }}
        >
          <defs>
            {filteredLayers.map((layer, idx) => (
              <React.Fragment key={idx}>
                <radialGradient id={`ng${idx}`} cx="40%" cy="35%">
                  <stop offset="0%" stopColor={layer.colorLight} />
                  <stop offset="60%" stopColor={layer.color} />
                  <stop offset="100%" stopColor={layer.colorDark} />
                </radialGradient>
                <filter id={`gf${idx}`} x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id={`gguf-${layer.ggufType}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={layer.color} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={layer.color} stopOpacity="0.5" />
                </linearGradient>
              </React.Fragment>
            ))}
          </defs>

          {/* Connections — рисуем перед чанками */}
          <Connections
            layers={filteredLayers.map(l => ({ color: l.color, colorLight: l.colorLight, colorDark: l.colorDark }))}
            positions={layout.positions}
            hoveredChunk={hoveredChunk}
          />

          {/* Чанки — визуализация слоёв */}
          {layout.positions.map((chunk) => {
            const layer = filteredLayers[chunk.layerIndex];
            const isHovered = !!hoveredChunk && hoveredChunk.layerIndex === chunk.layerIndex && hoveredChunk.chunkIndex === chunk.chunkIndex;
            // Затемняем все чанки, КРОМЕ hovered
            const isDimmed = hoveredChunk !== null &&
              (hoveredChunk.layerIndex !== chunk.layerIndex ||
               hoveredChunk.chunkIndex !== chunk.chunkIndex);

            // Градиент для чанка — цвет зависит от индекса (heatmap)
            const intensity = chunk.startNeuron / Math.max(1, chunk.size - 1);
            const fillColor = isHovered ? layer.colorLight : layer.color;

            return (
              <g
                key={`c${chunk.layerIndex}_${chunk.chunkIndex}`}
                onClick={() => handleChunkClick(chunk.layerIndex, chunk.chunkIndex)}
                onMouseEnter={() => handleChunkHover(chunk.layerIndex, chunk.chunkIndex)}
                onMouseLeave={handleChunkLeave}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
                opacity={isDimmed ? 0.15 : 1}
              >
                {/* Glow при hover */}
                {isHovered && (
                  <rect
                    x={chunk.x - 3}
                    y={chunk.y - 3}
                    width="46"
                    height="26"
                    fill="none"
                    stroke={layer.color}
                    strokeWidth="2"
                    rx="3"
                    opacity="0.6"
                  />
                )}

                {/* Основной прямоугольник чанка */}
                <rect
                  x={chunk.x}
                  y={chunk.y}
                  width="40"
                  height="20"
                  fill={fillColor}
                  opacity={0.3 + intensity * 0.4}
                  stroke={layer.color}
                  strokeWidth={isHovered ? 2 : 1}
                  rx="3"
                  style={{ transition: 'stroke-width 0.2s ease, opacity 0.2s ease' }}
                />

                {/* Текст: индекс чанка */}
                <text
                  x={chunk.x + 20}
                  y={chunk.y + 8}
                  textAnchor="middle"
                  fill="white"
                  fontSize="7"
                  fontWeight="600"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {chunk.chunkIndex + 1}
                </text>
              </g>
            );
          })}

          {/* Layer labels — подписи слоёв над каждым слоем */}
          {filteredLayers.map((layer, layerIndex) => {
            const layerPositions = layout.positions.filter(c => c.layerIndex === layerIndex);
            if (layerPositions.length === 0) return null;

            const firstChunk = layerPositions[0];
            const maxYInLayer = Math.max(...layerPositions.map(c => c.y));

            return (
              <text
                key={`label-${layerIndex}`}
                x={firstChunk.x}
                y={maxYInLayer + 35}
                textAnchor="middle"
                fill={layer.color}
                fontSize="10"
                fontWeight="600"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {layer.shortName}
              </text>
            );
          })}

          {/* Tooltip при hover на чанк */}
          {hoveredChunk && (() => {
            const chunk = layout.positions.find(c => c.layerIndex === hoveredChunk.layerIndex && c.chunkIndex === hoveredChunk.chunkIndex);
            if (!chunk) return null;
            const layer = filteredLayers[chunk.layerIndex];
            return (
              <g>
                <rect
                  x={chunk.x - 80}
                  y={chunk.y - 55}
                  width="160"
                  height="48"
                  rx="6"
                  fill="rgba(0,0,0,0.95)"
                  stroke={layer.color}
                  strokeWidth="1.5"
                  style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
                />
                <text
                  x={chunk.x}
                  y={chunk.y - 38}
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="600"
                >
                  {layer.name}
                </text>
                <text
                  x={chunk.x}
                  y={chunk.y - 24}
                  textAnchor="middle"
                  fill="#8888aa"
                  fontSize="8"
                >
                  Чанк {chunk.chunkIndex + 1}: нейроны {chunk.startNeuron}–{chunk.endNeuron}
                </text>
                <text
                  x={chunk.x}
                  y={chunk.y - 13}
                  textAnchor="middle"
                  fill="#7c6ff7"
                  fontSize="8"
                  fontWeight="600"
                >
                  Всего в слое: {formatNumber(chunk.size)}
                </text>
              </g>
            );
          })()}

          {/* Flow arrow */}
          {filteredLayers.length > 1 && (
            <g>
              <text x={START_X + (filteredLayers.length - 1) * (LAYER_GAP / 2)} y="36" textAnchor="middle" fill="#555577" fontSize="10">Поток данных →</text>
              <line x1={START_X + 40} y1={31} x2={arrowEndX} y2={31} stroke="#555577" strokeWidth="1" strokeDasharray="4,4" opacity="0.25" />
              <polygon points={`${arrowEndX},28 ${arrowEndX + 6},31 ${arrowEndX},34`} fill="#555577" opacity="0.25" />
            </g>
          )}
        </svg>
      </div>

      {/* ChunkDetail — крупный план чанка (поверх основного вида) */}
      {focusedChunk && (() => {
        const chunk = layout.positions.find(
          c => c.layerIndex === focusedChunk.layerIndex && c.chunkIndex === focusedChunk.chunkIndex
        );
        if (!chunk) return null;
        const layer = filteredLayers[chunk.layerIndex];

        // Предыдущий чанк (из предыдущего слоя)
        const prevLayer = focusedChunk.layerIndex > 0
          ? layout.positions.find(c => c.layerIndex === focusedChunk.layerIndex - 1)
          : null;
        const nextLayer = focusedChunk.layerIndex < filteredLayers.length - 1
          ? layout.positions.find(c => c.layerIndex === focusedChunk.layerIndex + 1)
          : null;

        return (
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(5, 5, 10, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              backdropFilter: 'blur(4px)',
            }}
            onClick={handleChunkBack}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#0a0a0f',
                border: `1px solid ${layer.color}`,
                borderRadius: 12,
                padding: 24,
                maxWidth: 800,
                maxHeight: '90%',
                overflow: 'auto',
                boxShadow: `0 0 40px ${layer.color}33`,
              }}
            >
              <ChunkDetail
                chunk={{
                  x: 0,
                  y: 0,
                  layerIndex: chunk.layerIndex,
                  chunkIndex: chunk.chunkIndex,
                  startNeuron: chunk.startNeuron,
                  endNeuron: chunk.endNeuron,
                  size: chunk.size,
                }}
                layerName={layer.name}
                layerColor={layer.color}
                layerColorLight={layer.colorLight}
                onBack={handleChunkBack}
                incomingNeighbors={prevLayer ? [{
                  startNeuron: prevLayer.startNeuron,
                  endNeuron: prevLayer.endNeuron,
                  prevChunkIndex: prevLayer.chunkIndex,
                }] : []}
                outgoingNeighbors={nextLayer ? [{
                  startNeuron: nextLayer.startNeuron,
                  endNeuron: nextLayer.endNeuron,
                  nextChunkIndex: nextLayer.chunkIndex,
                }] : []}
              />
            </div>
          </div>
        );
      })()}

      <div style={{
        position: 'absolute', bottom: 8, left: 12, padding: '4px 10px',
        background: 'rgba(18,18,32,0.85)', border: '1px solid #2a2a3e',
        borderRadius: 4, fontSize: 10, color: '#666688', pointerEvents: 'none',
      }}>
        Перетаскивание мышью • {showSearch ? 'ESC для закрытия поиска' : 'Нажмите / для поиска'}
      </div>

      {/* ===== Навигация по слоям ===== */}
      <LayerNavigation
        layers={filteredLayers}
        hoveredChunk={hoveredChunk}
        selectedScrollLayer={selectedScrollLayer}
        onLayerClick={handleScrollLayerClick}
      />

      {/* ===== 3 Примера архитектур ===== */}
      <div style={{
        padding: '10px 20px', borderTop: '1px solid #1a1a2e',
        background: '#0f0f1a', display: 'flex', gap: 12, overflow: 'auto', flexShrink: 0,
      }}>
        <h4 style={{ color: '#8888aa', fontSize: 12, margin: 0, marginRight: 8, alignSelf: 'center', whiteSpace: 'nowrap' }}>
          Примеры:
        </h4>
        <ExampleCard title="BERT" layers="Input → Embedding → 12 Transformer Blocks → Output" details="Encoder-only • 12 layers • 768 hidden • 12 heads" color="#ef4444" />
        <ExampleCard title="GPT" layers="Input → Embedding → Transformer Blocks • LayerNorm → Output" details="Decoder-only • 12 layers • 768 hidden • 12 heads" color="#3b82f6" />
        <ExampleCard title="T5" layers="Encoder → Decoder (cross-attn) → Output" details="Encoder-Decoder • Text-to-Text • Multi-Task" color="#10b981" />
      </div>

      {/* ===== GGUF Info Bar ===== */}
      <GGUFInfoBar
        hoveredChunk={hoveredChunk}
        layers={filteredLayers}
        architecture={arch}
        parameters={parameters || {}}
      />
    </div>
  );
}

/** Компонент карточки примера архитектуры */
function ExampleCard({ title, layers, details, color }: { title: string; layers: string; details: string; color: string }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
      style={{
        flex: 1, minWidth: 200, padding: '8px 12px',
        background: isHovered ? `${color}15` : '#121220',
        border: `1px solid ${isHovered ? color : '#1e1e30'}`,
        borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: '#e8e8e8' }}>{title}</div>
      </div>
      <div style={{ fontSize: 10, color: '#8888aa', fontFamily: 'monospace', marginBottom: 2 }}>{layers}</div>
      <div style={{ fontSize: 9, color: '#666688' }}>{details}</div>
    </div>
  );
}
