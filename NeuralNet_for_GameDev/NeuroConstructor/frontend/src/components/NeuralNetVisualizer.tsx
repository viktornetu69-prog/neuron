/**
 * NeuralNetVisualizer — визуализатор архитектуры нейронной сети с GGUF-специфичными элементами
 * Отображает структуру: Input → Embedding → Transformer Blocks → Output
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { NeuronNode } from './NeuronNode';
import { Connections } from './Connections';
import { LayerNavigation } from './LayerNavigation';
import GGUFGroup from './GGUFGroup';
import GGUFInfoBar from './GGUFInfoBar';
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
}

interface LayerConfig {
  name: string;
  shortName: string;
  neuronCount: number;
  color: string;
  colorLight: string;
  colorDark: string;
  description: string;
  ggufType: GGUFGroupType;
}

interface NeuronPosition {
  x: number;
  y: number;
  layerIndex: number;
  neuronIndex: number;
}

interface LayoutResult {
  positions: NeuronPosition[];
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

const LAYER_GAP = 160;
const START_X = 80;
const CENTER_Y = 280;
const MIN_NEURONS = 6;
const MAX_NEURONS = 10;

// ============================================================================
// Утилиты
// ============================================================================

const formatNumber = (num: number): string => {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
  return num.toString();
};

const computeNeuronCount = (value: number): number => {
  return Math.min(MAX_NEURONS, Math.max(MIN_NEURONS, Math.ceil(Math.log2(value + 1))));
};

const validateArchitecture = (arch: ArchitectureParams | undefined | null): ArchitectureParams => {
  if (!arch || typeof arch !== 'object') {
    return DEFAULT_ARCHITECTURE;
  }

  const validated: ArchitectureParams = { ...DEFAULT_ARCHITECTURE, ...arch };

  validated.num_layers = typeof validated.num_layers === 'number' && validated.num_layers >= 1
    ? validated.num_layers
    : DEFAULT_ARCHITECTURE.num_layers;
  validated.hidden_size = typeof validated.hidden_size === 'number' && validated.hidden_size >= 1
    ? validated.hidden_size
    : DEFAULT_ARCHITECTURE.hidden_size;
  validated.vocab_size = typeof validated.vocab_size === 'number' && validated.vocab_size >= 0
    ? validated.vocab_size
    : DEFAULT_ARCHITECTURE.vocab_size;
  validated.num_heads = typeof validated.num_heads === 'number' && validated.num_heads >= 1
    ? validated.num_heads
    : DEFAULT_ARCHITECTURE.num_heads;
  validated.head_dim = typeof validated.head_dim === 'number' && validated.head_dim >= 1
    ? validated.head_dim
    : DEFAULT_ARCHITECTURE.head_dim;

  return validated;
};

// ============================================================================
// Основной компонент
// ============================================================================

/**
 * NeuralNetVisualizer — визуализация архитектуры с GGUF-специфичными элементами
 */
export function NeuralNetVisualizer({
  architecture,
  parameters,
}: NeuralNetVisualizerProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const focusLayerRef = useRef<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 700,
  });
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredNeuron, setHoveredNeuron] = useState<{
    layerIndex: number;
    neuronIndex: number;
  } | null>(null);
  const [userPanned, setUserPanned] = useState<boolean>(false);
  const [selectedScrollLayer, setSelectedScrollLayer] = useState<number | null>(null);

  // Валидация архитектуры
  const arch: ArchitectureParams = useMemo<ArchitectureParams>(
    () => validateArchitecture(architecture),
    [architecture]
  );

  // Завершение загрузки
  useEffect(() => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // СЛОИ с GGUF-специфичной группировкой
  const layers: LayerConfig[] = useMemo<LayerConfig[]>(() => {
    const vocabSize: number = Number(arch.vocab_size ?? DEFAULT_ARCHITECTURE.vocab_size);
    const hiddenSize: number = Number(arch.hidden_size ?? DEFAULT_ARCHITECTURE.hidden_size);
    const numLayers: number = Number(arch.num_layers ?? DEFAULT_ARCHITECTURE.num_layers);
    const heads: number = Number(arch.num_heads ?? DEFAULT_ARCHITECTURE.num_heads);
    const headDim: number = Number(arch.head_dim ?? Math.round(hiddenSize / heads));

    const inputNeurons: number = computeNeuronCount(vocabSize);
    const hiddenNeurons: number = computeNeuronCount(hiddenSize);

    const result: LayerConfig[] = [];

    // Input Layer
    result.push({
      name: 'Input Layer',
      shortName: 'Вход',
      neuronCount: inputNeurons,
      color: GGUF_GROUP_CONFIG.input.color,
      colorLight: GGUF_GROUP_CONFIG.input.colorLight,
      colorDark: GGUF_GROUP_CONFIG.input.colorDark,
      description: `${formatNumber(vocabSize)} токенов`,
      ggufType: 'input',
    });

    // Embedding Layer
    result.push({
      name: 'Embedding Layer',
      shortName: 'Встраивания',
      neuronCount: hiddenNeurons,
      color: GGUF_GROUP_CONFIG.embedding.color,
      colorLight: GGUF_GROUP_CONFIG.embedding.colorLight,
      colorDark: GGUF_GROUP_CONFIG.embedding.colorDark,
      description: `${vocabSize} × ${hiddenSize} matrix`,
      ggufType: 'embedding',
    });

    // Transformer Blocks
    for (let i: number = 0; i < numLayers; i++) {
      result.push({
        name: `Transformer Block ${i + 1}/${numLayers}`,
        shortName: `B${i + 1}`,
        neuronCount: hiddenNeurons,
        color: i % 2 === 0 ? GGUF_GROUP_CONFIG.hidden.color : GGUF_GROUP_CONFIG.hidden.colorLight,
        colorLight: i % 2 === 0 ? GGUF_GROUP_CONFIG.hidden.colorLight : '#ffffff',
        colorDark: i % 2 === 0 ? GGUF_GROUP_CONFIG.hidden.colorDark : '#84cc16',
        description: `${heads}h × ${headDim}d`,
        ggufType: 'hidden',
      });
    }

    // Output Layer
    result.push({
      name: 'Output Layer',
      shortName: 'Выход',
      neuronCount: inputNeurons,
      color: GGUF_GROUP_CONFIG.output.color,
      colorLight: GGUF_GROUP_CONFIG.output.colorLight,
      colorDark: GGUF_GROUP_CONFIG.output.colorDark,
      description: `${formatNumber(vocabSize)} классов`,
      ggufType: 'output',
    });

    return result;
  }, [arch]);

  // Layout: позиции нейронов
  const layout: LayoutResult = useMemo<LayoutResult>(() => {
    const positions: NeuronPosition[] = [];

    layers.forEach((layer: LayerConfig, layerIndex: number) => {
      const x: number = START_X + layerIndex * LAYER_GAP;
      const neuronGap: number = Math.min(48, Math.max(28, 380 / Math.max(layer.neuronCount, 2)));
      const startY: number = CENTER_Y - ((layer.neuronCount - 1) * neuronGap) / 2;

      for (let i: number = 0; i < layer.neuronCount; i++) {
        positions.push({ x, y: startY + i * neuronGap, layerIndex, neuronIndex: i });
      }
    });

    const minX: number = Math.min(...positions.map((n: NeuronPosition) => n.x)) - 80;
    const maxX: number = Math.max(...positions.map((n: NeuronPosition) => n.x)) + 80;
    const minY: number = Math.min(...positions.map((n: NeuronPosition) => n.y)) - 50;
    const maxY: number = Math.max(...positions.map((n: NeuronPosition) => n.y)) + 50;

    return {
      positions,
      minX,
      maxX,
      minY,
      maxY,
      contentWidth: maxX - minX,
      contentHeight: maxY - minY,
    };
  }, [layers]);

  // Auto-fit
  const autoFit: AutoFitResult = useMemo<AutoFitResult>(() => {
    const w: number = containerSize.width;
    const h: number = containerSize.height - 60;
    const s: number = Math.min(
      w / layout.contentWidth,
      h / layout.contentHeight,
      1.1
    );

    return {
      scale: s,
      panX: (w - layout.contentWidth * s) / 2 - layout.minX * s,
      panY: (h - layout.contentHeight * s) / 2 - layout.minY * s + 10,
    };
  }, [layout, containerSize]);

  const displayPan: { x: number; y: number } = userPanned
    ? pan
    : { x: autoFit.panX, y: autoFit.panY };
  const displayZoom: number = userPanned ? zoom : autoFit.scale;

  // Обработчики зума
  const zoomIn: () => void = useCallback(() => {
    setZoom((prev: number) => Math.min(3, prev + 0.2));
  }, []);

  const zoomOut: () => void = useCallback(() => {
    setZoom((prev: number) => Math.max(0.1, prev - 0.2));
  }, []);

  const resetAll: () => void = useCallback(() => {
    setUserPanned(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel: (e: React.WheelEvent) => void = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setUserPanned(true);
    const delta: number = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev: number) => Math.max(0.1, Math.min(3, prev + delta)));
  }, []);

  const handleMouseDown: (e: React.MouseEvent) => void = useCallback(
    (e: React.MouseEvent) => {
      setUserPanned(true);
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan]
  );

  const handleMouseMove: (e: React.MouseEvent) => void = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp: () => void = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Resize handler
  useEffect(() => {
    const handleResize: () => void = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setContainerSize({ width: clientWidth, height: clientHeight });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Плавная навигация по слоям с анимацией
  const handleScrollLayerClick: (layerIndex: number) => void = useCallback(
    (layerIndex: number) => {
      setSelectedScrollLayer(layerIndex);
      setUserPanned(true);
      focusLayerRef.current = layerIndex;

      const layerPositions: NeuronPosition[] = layout.positions.filter(
        (n: NeuronPosition) => n.layerIndex === layerIndex
      );
      if (layerPositions.length === 0) return;

      const cx: number = layerPositions[0].x;
      const cy: number = layerPositions[0].y;
      const targetX: number = -cx * displayZoom + containerSize.width / 2;
      const targetY: number = -cy * displayZoom + containerSize.height / 2;
      setPan({ x: targetX, y: targetY });
    },
    [layout.positions, displayZoom, containerSize]
  );

  // Hover / Focus нейрона
  const handleNeuronHover: (layerIndex: number, neuronIndex: number) => void = useCallback(
    (layerIndex: number, neuronIndex: number) => {
      setHoveredNeuron({ layerIndex, neuronIndex });
    },
    []
  );

  const handleNeuronLeave: () => void = useCallback(() => {
    setHoveredNeuron(null);
  }, []);

  // Клавиатурная навигация
  const handleKeyDown: (e: React.KeyboardEvent) => void = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        focusLayerRef.current = Math.min(
          focusLayerRef.current + 1,
          layers.length - 1
        );
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
        focusLayerRef.current = layers.length - 1;
        handleScrollLayerClick(layers.length - 1);
      }
    },
    [layers.length, handleScrollLayerClick]
  );

  const arrowEndX: number = START_X + (layers.length - 1) * LAYER_GAP + 50;

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
        }}
        role="status"
        aria-label="Загрузка визуализации"
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: '3px solid #2a2a3e',
              borderTopColor: '#7c6ff7',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <div style={{ fontSize: 14, color: '#8888aa' }}>Загрузка архитектуры...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#0a0a0f',
        userSelect: 'none',
      }}
      role="application"
      aria-label="Визуализация архитектуры нейронной сети"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ===== Header ===== */}
      <header
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid #1a1a2e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#0f0f1a',
          flexShrink: 0,
        }}
      >
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#e8e8e8', margin: 0 }}>
            🧠 {((arch.model_family || 'unknown').toUpperCase())} — GGUF Архитектура
          </h3>
          <div style={{ fontSize: 11, color: '#8888aa', marginTop: 2 }}>
            {layers.length} слоёв • {layout.positions.length} нейронов •{' '}
            <span style={{ color: '#7c6ff7', fontWeight: 600 }}>
              {parameters?.estimated_total_params ? formatNumber(parameters.estimated_total_params) : 'N/A'} параметров
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={zoomOut}
            title="Уменьшить"
            aria-label="Уменьшить масштаб"
            style={{
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1a1a2e',
              border: '1px solid #2a2a3e',
              borderRadius: 4,
              color: '#ccc',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            −
          </button>
          <span
            style={{ fontSize: 10, color: '#8888aa', minWidth: 36, textAlign: 'center' }}
            aria-hidden="true"
          >
            {Math.round(displayZoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            title="Увеличить"
            aria-label="Увеличить масштаб"
            style={{
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1a1a2e',
              border: '1px solid #2a2a3e',
              borderRadius: 4,
              color: '#ccc',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            +
          </button>
          <button
            onClick={resetAll}
            title="Сбросить вид"
            aria-label="Сбросить масштаб и позицию"
            style={{
              padding: '3px 10px',
              background: '#1a1a2e',
              border: '1px solid #2a2a3e',
              borderRadius: 4,
              color: '#8888aa',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            ⟲
          </button>
        </div>
      </header>

      {/* ===== Canvas — SVG визуализация ===== */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          cursor: isDragging ? 'move' : 'grab',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        role="img"
        aria-label={`Архитектура ${arch.model_family || 'нейросети'}: ${layers.length} слоёв`}
      >
        <svg
          width={containerSize.width}
          height={containerSize.height}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translate(${displayPan.x}px,${displayPan.y}px) scale(${displayZoom})`,
            transformOrigin: '0 0',
            transition: 'transform 0.3s ease',
          }}
        >
          {/* Определения: градиенты и фильтры */}
          <defs>
            {layers.map((layer: LayerConfig, idx: number) => (
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
                {/* GGUF тип градиент */}
                <linearGradient id={`gguf-${layer.ggufType}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={layer.color} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={layer.color} stopOpacity="0.5" />
                </linearGradient>
              </React.Fragment>
            ))}
          </defs>

          {/* GGUF-специфичные группы слоёв */}
          {layers.map((layer: LayerConfig, layerIndex: number) => {
            const config = GGUF_GROUP_CONFIG[layer.ggufType];
            const isActive = hoveredNeuron && hoveredNeuron.layerIndex === layerIndex;

            return (
              <GGUFGroup
                key={`gguf-${layerIndex}`}
                config={config}
                layerIndex={layerIndex}
                totalLayers={layers.length}
                isActive={!!isActive}
                onClick={handleScrollLayerClick}
                x={START_X + layerIndex * LAYER_GAP}
                y={CENTER_Y}
              />
            );
          })}

          {/* Связи между нейронами (оптимизировано) */}
          <Connections
            layers={layers.map((l: LayerConfig) => ({
              color: l.color,
              colorLight: l.colorLight,
              colorDark: l.colorDark,
            }))}
            positions={layout.positions}
            hoveredNeuron={hoveredNeuron}
          />

          {/* Нейроны (memoized) */}
          {layout.positions.map((neuron: NeuronPosition) => {
            const layer: LayerConfig = layers[neuron.layerIndex];
            const isHovered: boolean =
              !!hoveredNeuron &&
              hoveredNeuron.layerIndex === neuron.layerIndex &&
              hoveredNeuron.neuronIndex === neuron.neuronIndex;
            const isDimmed: boolean =
              hoveredNeuron !== null && hoveredNeuron.layerIndex !== neuron.layerIndex;

            return (
              <NeuronNode
                key={`n${neuron.layerIndex}_${neuron.neuronIndex}`}
                x={neuron.x}
                y={neuron.y}
                layerIndex={neuron.layerIndex}
                neuronIndex={neuron.neuronIndex}
                layerColor={layer.color}
                layerColorLight={layer.colorLight}
                layerColorDark={layer.colorDark}
                isHovered={isHovered}
                isDimmed={isDimmed}
                onHover={() => handleNeuronHover(neuron.layerIndex, neuron.neuronIndex)}
                onLeave={handleNeuronLeave}
                onFocus={() => handleNeuronHover(neuron.layerIndex, neuron.neuronIndex)}
                onBlur={handleNeuronLeave}
              />
            );
          })}

          {/* Стрелка потока данных */}
          {layers.length > 1 && (
            <g>
              <text
                x={START_X + (layers.length - 1) * (LAYER_GAP / 2)}
                y="36"
                textAnchor="middle"
                fill="#555577"
                fontSize="10"
              >
                Поток данных →
              </text>
              <line
                x1={START_X + 40}
                y1={31}
                x2={arrowEndX}
                y2={31}
                stroke="#555577"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.25"
              />
              <polygon
                points={`${arrowEndX},28 ${arrowEndX + 6},31 ${arrowEndX},34`}
                fill="#555577"
                opacity="0.25"
              />
            </g>
          )}
        </svg>

        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 12,
            padding: '4px 10px',
            background: 'rgba(18,18,32,0.85)',
            border: '1px solid #2a2a3e',
            borderRadius: 4,
            fontSize: 10,
            color: '#666688',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          Перетаскивание мышью
        </div>
      </div>

      {/* ===== Навигация по слоям ===== */}
      <LayerNavigation
        layers={layers}
        hoveredNeuron={hoveredNeuron}
        selectedScrollLayer={selectedScrollLayer}
        onLayerClick={handleScrollLayerClick}
      />

      {/* ===== 3 Примера архитектур ===== */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid #1a1a2e',
        background: '#0f0f1a',
        display: 'flex',
        gap: 16,
        overflow: 'auto',
        flexShrink: 0,
      }}>
        <h4 style={{
          color: '#8888aa',
          fontSize: 12,
          margin: 0,
          marginRight: 12,
          alignSelf: 'center',
          whiteSpace: 'nowrap',
        }}>
          Примеры архитектур:
        </h4>
        <ExampleCard
          title="BERT"
          layers="Input → Embedding → 12 Transformer Blocks → Output"
          details="Encoder-only • 12 layers • 768 hidden • 12 heads"
          color="#ef4444"
        />
        <ExampleCard
          title="GPT"
          layers="Input → Embedding → Transformer Blocks • LayerNorm → Output"
          details="Decoder-only • 12 layers • 768 hidden • 12 heads"
          color="#3b82f6"
        />
        <ExampleCard
          title="T5"
          layers="Encoder → Decoder (cross-attn) → Output"
          details="Encoder-Decoder • Text-to-Text • Multi-Task"
          color="#10b981"
        />
      </div>

      {/* ===== GGUF Info Bar ===== */}
      <GGUFInfoBar
        hoveredNeuron={hoveredNeuron}
        layers={layers}
        architecture={arch}
        parameters={parameters || {}}
      />
    </div>
  );
}

/**
 * Компонент карточки примера архитектуры
 */
function ExampleCard({
  title,
  layers,
  details,
  color,
}: {
  title: string;
  layers: string;
  details: string;
  color: string;
}) {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        flex: 1,
        minWidth: 200,
        padding: '10px 14px',
        background: isHovered ? `${color}15` : '#121220',
        border: `1px solid ${isHovered ? color : '#1e1e30'}`,
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }} />
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#e8e8e8',
        }}>
          {title}
        </div>
      </div>
      <div style={{
        fontSize: 11,
        color: '#8888aa',
        marginBottom: 4,
        fontFamily: 'monospace',
      }}>
        {layers}
      </div>
      <div style={{
        fontSize: 10,
        color: '#666688',
      }}>
        {details}
      </div>
    </div>
  );
}
