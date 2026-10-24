/**
 * NeuralNetVisualizer — визуализатор архитектуры нейронной сети
 * 
 * Полностью на русском, без наложений, smooth transitions
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { NeuronNode } from './NeuronNode';
import { Connections, type ConnectionWeight } from './Connections';
import { LayerNavigation } from './LayerNavigation';
import GGUFInfoBar from './GGUFInfoBar';
import { GGUF_GROUP_CONFIG } from './gguf-layer-config';

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
  ggufType: string;
  activation: string;
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

const LAYER_GAP = 140;
const START_X = 60;
const CENTER_Y = 220;
const MIN_NEURONS = 6;
const MAX_NEURONS = 10;
const PADDING = 80; // Увеличен для предотвращения обрезки

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
  if (!arch || typeof arch !== 'object') return DEFAULT_ARCHITECTURE;
  const v = { ...DEFAULT_ARCHITECTURE, ...arch };
  v.num_layers = (typeof v.num_layers === 'number' && v.num_layers >= 1) ? v.num_layers : DEFAULT_ARCHITECTURE.num_layers;
  v.hidden_size = (typeof v.hidden_size === 'number' && v.hidden_size >= 1) ? v.hidden_size : DEFAULT_ARCHITECTURE.hidden_size;
  v.vocab_size = (typeof v.vocab_size === 'number' && v.vocab_size >= 0) ? v.vocab_size : DEFAULT_ARCHITECTURE.vocab_size;
  v.num_heads = (typeof v.num_heads === 'number' && v.num_heads >= 1) ? v.num_heads : DEFAULT_ARCHITECTURE.num_heads;
  v.head_dim = (typeof v.head_dim === 'number' && v.head_dim >= 1) ? v.head_dim : DEFAULT_ARCHITECTURE.head_dim;
  return v;
};

// ============================================================================
// Основной компонент
// ============================================================================

export function NeuralNetVisualizer({
  architecture,
  parameters,
}: NeuralNetVisualizerProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNeuron, setHoveredNeuron] = useState<{ layerIndex: number; neuronIndex: number } | null>(null);
  const [userPanned, setUserPanned] = useState(false);
  const [selectedScrollLayer, setSelectedScrollLayer] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [hoveredConnection, setHoveredConnection] = useState<ConnectionWeight | null>(null);

  const arch: ArchitectureParams = useMemo(() => validateArchitecture(architecture), [architecture]);
  const focusRef = useRef(0);

  // Завершение загрузки
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // СЛОИ
  const layers: LayerConfig[] = useMemo(() => {
    const vocabSize = Number(arch.vocab_size ?? 30522);
    const hiddenSize = Number(arch.hidden_size ?? 768);
    const numLayers = Number(arch.num_layers ?? 4);
    const heads = Number(arch.num_heads ?? 12);
    const headDim = Number(arch.head_dim ?? Math.round(hiddenSize / heads));
    const inputNeurons = computeNeuronCount(vocabSize);
    const hiddenNeurons = computeNeuronCount(hiddenSize);
    const result: LayerConfig[] = [];

    // Вход
    result.push({
      name: 'Входной слой',
      shortName: 'Вход',
      neuronCount: inputNeurons,
      color: GGUF_GROUP_CONFIG.input.color,
      colorLight: GGUF_GROUP_CONFIG.input.colorLight,
      colorDark: GGUF_GROUP_CONFIG.input.colorDark,
      description: `${formatNumber(vocabSize)} токенов`,
      ggufType: 'input',
      activation: 'linear',
    });

    // Встраивания
    result.push({
      name: 'Слой встраиваний',
      shortName: 'Эмбеддинг',
      neuronCount: hiddenNeurons,
      color: GGUF_GROUP_CONFIG.embedding.color,
      colorLight: GGUF_GROUP_CONFIG.embedding.colorLight,
      colorDark: GGUF_GROUP_CONFIG.embedding.colorDark,
      description: `${vocabSize} × ${hiddenSize}`,
      ggufType: 'embedding',
      activation: 'linear',
    });

    // Трансформер блоки
    for (let i = 0; i < numLayers; i++) {
      result.push({
        name: `Трансформер блок ${i + 1}/${numLayers}`,
        shortName: `Блок ${i + 1}`,
        neuronCount: hiddenNeurons,
        color: i % 2 === 0 ? GGUF_GROUP_CONFIG.hidden.color : GGUF_GROUP_CONFIG.hidden.colorLight,
        colorLight: i % 2 === 0 ? GGUF_GROUP_CONFIG.hidden.colorLight : '#ffffff',
        colorDark: i % 2 === 0 ? GGUF_GROUP_CONFIG.hidden.colorDark : '#84cc16',
        description: `${heads}h × ${headDim}d`,
        ggufType: 'hidden',
        activation: 'gelu',
      });
    }

    // Выход
    result.push({
      name: 'Выходной слой',
      shortName: 'Выход',
      neuronCount: inputNeurons,
      color: GGUF_GROUP_CONFIG.output.color,
      colorLight: GGUF_GROUP_CONFIG.output.colorLight,
      colorDark: GGUF_GROUP_CONFIG.output.colorDark,
      description: `${formatNumber(vocabSize)} классов`,
      ggufType: 'output',
      activation: 'softmax',
    });

    return result;
  }, [arch]);

  // Фильтрация
  const filteredLayers = useMemo(() => {
    let r = layers;
    if (activeFilter !== 'all') r = r.filter(l => l.ggufType === activeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(l => l.name.toLowerCase().includes(q) || l.shortName.toLowerCase().includes(q));
    }
    return r;
  }, [layers, activeFilter, searchQuery]);

  // Layout с увеличенным padding
  const layout: LayoutResult = useMemo(() => {
    const positions: NeuronPosition[] = [];
    filteredLayers.forEach((layer, layerIndex) => {
      const x = START_X + layerIndex * LAYER_GAP;
      const neuronGap = Math.min(44, Math.max(24, 340 / Math.max(layer.neuronCount, 2)));
      const startY = CENTER_Y - ((layer.neuronCount - 1) * neuronGap) / 2;
      for (let i = 0; i < layer.neuronCount; i++) {
        positions.push({ x, y: startY + i * neuronGap, layerIndex, neuronIndex: i });
      }
    });

    const minX = Math.min(...positions.map(n => n.x)) - PADDING;
    const maxX = Math.max(...positions.map(n => n.x)) + PADDING;
    const minY = Math.min(...positions.map(n => n.y)) - PADDING;
    const maxY = Math.max(...positions.map(n => n.y)) + PADDING;

    return {
      positions,
      minX, maxX, minY, maxY,
      contentWidth: maxX - minX,
      contentHeight: maxY - minY,
    };
  }, [filteredLayers]);

  // Auto-fit
  const autoFit: AutoFitResult = useMemo(() => {
    const w = containerSize.width;
    const h = containerSize.height - 120; // Больше места для UI
    const s = Math.min(w / layout.contentWidth, h / layout.contentHeight, 1.1);
    return {
      scale: s,
      panX: (w - layout.contentWidth * s) / 2 - layout.minX * s,
      panY: (h - layout.contentHeight * s) / 2 - layout.minY * s + 10,
    };
  }, [layout, containerSize]);

  const displayPan = userPanned ? pan : { x: autoFit.panX, y: autoFit.panY };
  const displayZoom = userPanned ? zoom : autoFit.scale;

  // Handlers
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
    setZoom(prev => Math.max(0.1, Math.min(3, prev + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setUserPanned(true);
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerSize({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScrollLayerClick = useCallback((layerIndex: number) => {
    setSelectedScrollLayer(layerIndex);
    setUserPanned(true);
    focusRef.current = layerIndex;
    const layerPositions = layout.positions.filter(n => n.layerIndex === layerIndex);
    if (layerPositions.length === 0) return;
    const cx = layerPositions[0].x;
    const cy = layerPositions[0].y;
    setPan({ x: -cx * displayZoom + containerSize.width / 2, y: -cy * displayZoom + containerSize.height / 2 });
  }, [layout.positions, displayZoom, containerSize]);

  const handleNeuronHover = useCallback((layerIndex: number, neuronIndex: number) => {
    setHoveredNeuron({ layerIndex, neuronIndex });
  }, []);

  const handleNeuronLeave = useCallback(() => setHoveredNeuron(null), []);

  const handleConnectionHover = useCallback((conn: ConnectionWeight | null) => {
    setHoveredConnection(conn);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusRef.current = Math.min(focusRef.current + 1, filteredLayers.length - 1);
      handleScrollLayerClick(focusRef.current);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusRef.current = Math.max(focusRef.current - 1, 0);
      handleScrollLayerClick(focusRef.current);
    } else if (e.key === 'Home') { handleScrollLayerClick(0); }
    else if (e.key === 'End') { handleScrollLayerClick(filteredLayers.length - 1); }
    else if (e.key === '/') { e.preventDefault(); setShowSearch(true); }
    else if (e.key === 'Escape') { setShowSearch(false); setShowExportMenu(false); setActiveFilter('all'); setSearchQuery(''); }
  }, [filteredLayers.length, handleScrollLayerClick]);

  // Экспорт JSON
  const handleExportJSON = useCallback(() => {
    const data = {
      модель: arch.model_family,
      архитектура: {
        размер_словаря: arch.vocab_size,
        скрытый_размер: arch.hidden_size,
        количество_блоков: arch.num_layers,
        заголовки_внимания: arch.num_heads,
        размер_головки: arch.head_dim,
        максимальный_контекст: arch.max_position_embeddings,
      },
      параметры: parameters || {},
      слои: filteredLayers.map((l, i) => ({
        индекс: i,
        название: l.name,
        тип: l.ggufType,
        нейронов: l.neuronCount,
        функция_активации: l.activation,
      })),
      экспортировано: new Date().toLocaleString('ru-RU'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `архитектура-${arch.model_family || 'nn'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [arch, parameters, filteredLayers]);

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div ref={containerRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #2a2a3e', borderTopColor: '#7c6ff7', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, color: '#8888aa' }}>Загрузка архитектуры...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const arrowEndX = START_X + (filteredLayers.length - 1) * LAYER_GAP + 50;

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0a0f', userSelect: 'none' }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ===== Header ===== */}
      <header style={{
        padding: '8px 16px', borderBottom: '1px solid #1a1a2e',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#0f0f1a', flexShrink: 0,
      }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8', margin: 0 }}>
            🧠 {((arch.model_family || 'неизвестно').toUpperCase())} — Архитектура
          </h3>
          <div style={{ fontSize: 10, color: '#8888aa', marginTop: 1 }}>
            {filteredLayers.length} слоёв • {layout.positions.length} нейронов •{' '}
            <span style={{ color: '#7c6ff7', fontWeight: 600 }}>
              {parameters?.estimated_total_params ? formatNumber(parameters.estimated_total_params) : 'N/A'} параметров
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {/* Фильтры */}
          {['all', 'input', 'embedding', 'hidden', 'output'].map(f => (
            <button key={f} onClick={() => setActiveFilter(f)} style={{
              padding: '2px 6px', background: activeFilter === f ? '#7c6ff7' : '#1a1a2e',
              border: '1px solid #2a2a3e', borderRadius: 3, color: activeFilter === f ? 'white' : '#8888aa',
              cursor: 'pointer', fontSize: 9,
            }}>
              {f === 'all' ? 'Все' : f === 'input' ? 'Вход' : f === 'embedding' ? 'Эмбед' : f === 'hidden' ? 'Скрытые' : 'Выход'}
            </button>
          ))}
          {/* Поиск */}
          <button onClick={() => setShowSearch(!showSearch)} style={{
            width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: showSearch ? '#7c6ff7' : '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 3,
            color: 'white', cursor: 'pointer', fontSize: 10,
          }}>🔍</button>
          {/* Экспорт */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowExportMenu(!showExportMenu)} style={{
              width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 3,
              color: '#8888aa', cursor: 'pointer', fontSize: 10,
            }}>📥</button>
            {showExportMenu && (
              <div style={{
                position: 'absolute', top: 24, right: 0, background: '#1a1a2e',
                border: '1px solid #2a2a3e', borderRadius: 6, padding: 4, zIndex: 100,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}>
                <button onClick={handleExportJSON} style={{
                  display: 'block', width: '100%', padding: '5px 10px', background: 'none',
                  border: 'none', color: '#e8e8e8', cursor: 'pointer', fontSize: 10, borderRadius: 4, textAlign: 'left',
                }}>Экспорт JSON</button>
              </div>
            )}
          </div>
          <button onClick={zoomOut} style={{
            width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 3,
            color: '#ccc', cursor: 'pointer', fontSize: 12, fontWeight: 700,
          }}>−</button>
          <span style={{ fontSize: 9, color: '#8888aa', minWidth: 32, textAlign: 'center' }}>
            {Math.round(displayZoom * 100)}%
          </span>
          <button onClick={zoomIn} style={{
            width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 3,
            color: '#ccc', cursor: 'pointer', fontSize: 12, fontWeight: 700,
          }}>+</button>
          <button onClick={resetAll} style={{
            padding: '2px 8px', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 3,
            color: '#8888aa', cursor: 'pointer', fontSize: 10,
          }}>⟲</button>
        </div>
      </header>

      {/* Поиск */}
      {showSearch && (
        <div style={{
          padding: '6px 16px', borderBottom: '1px solid #1a1a2e', background: '#0f0f1a',
          display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
        }}>
          <input
            autoFocus
            placeholder="Поиск слоя..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              flex: 1, padding: '5px 10px', background: '#121220', border: '1px solid #2a2a3e',
              borderRadius: 4, color: '#e8e8e8', fontSize: 11, outline: 'none',
            }}
          />
          <span style={{ color: '#666688', fontSize: 10 }}>{filteredLayers.length} найдено</span>
        </div>
      )}

      {/* ===== Canvas ===== */}
      <div
        style={{ flex: 1, overflow: 'hidden', position: 'relative', cursor: isDragging ? 'move' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width={containerSize.width}
          height={containerSize.height}
          style={{
            position: 'absolute', top: 0, left: 0,
            transform: `translate(${displayPan.x}px,${displayPan.y}px) scale(${displayZoom})`,
            transformOrigin: '0 0',
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

          {/* Связи с весами */}
          <Connections
            layers={filteredLayers.map(l => ({ color: l.color, colorLight: l.colorLight, colorDark: l.colorDark }))}
            positions={layout.positions}
            hoveredNeuron={hoveredNeuron}
            onConnectionHover={handleConnectionHover}
          />

          {/* Нейроны */}
          {layout.positions.map((neuron) => {
            const layer = filteredLayers[neuron.layerIndex];
            const isHovered = !!hoveredNeuron && hoveredNeuron.layerIndex === neuron.layerIndex && hoveredNeuron.neuronIndex === neuron.neuronIndex;
            const isDimmed = hoveredNeuron !== null && hoveredNeuron.layerIndex !== neuron.layerIndex;
            return (
              <NeuronNode
                key={`n${neuron.layerIndex}_${neuron.neuronIndex}`}
                x={neuron.x} y={neuron.y}
                layerIndex={neuron.layerIndex} neuronIndex={neuron.neuronIndex}
                layerColor={layer.color} layerColorLight={layer.colorLight} layerColorDark={layer.colorDark}
                layerName={layer.name}
                isHovered={isHovered} isDimmed={isDimmed}
                onHover={() => handleNeuronHover(neuron.layerIndex, neuron.neuronIndex)}
                onLeave={handleNeuronLeave}
                onFocus={() => handleNeuronHover(neuron.layerIndex, neuron.neuronIndex)}
                onBlur={handleNeuronLeave}
              />
            );
          })}

          {/* Tooltip связи */}
          {hoveredConnection && (
            <g>
              <rect
                x={Math.max(-40, Math.min((hoveredConnection.x1 + hoveredConnection.x2) / 2 - 45, containerSize.width / displayZoom - 90))}
                y={(hoveredConnection.y1 + hoveredConnection.y2) / 2 - 28}
                width="90" height="24" rx="4"
                fill="rgba(0,0,0,0.9)" stroke="#7c6ff7" strokeWidth="1"
              />
              <text
                x={(hoveredConnection.x1 + hoveredConnection.x2) / 2}
                y={(hoveredConnection.y1 + hoveredConnection.y2) / 2 - 14}
                textAnchor="middle"
                fill="#e8e8e8"
                fontSize="8"
              >
                Слой {hoveredConnection.fromLayer}→{hoveredConnection.toLayer}
              </text>
              <text
                x={(hoveredConnection.x1 + hoveredConnection.x2) / 2}
                y={(hoveredConnection.y1 + hoveredConnection.y2) / 2 - 5}
                textAnchor="middle"
                fill={hoveredConnection.weight >= 0 ? '#10b981' : '#ef4444'}
                fontSize="9"
                fontWeight="bold"
              >
                w = {hoveredConnection.weight > 0 ? '+' : ''}{hoveredConnection.weight.toFixed(3)}
              </text>
            </g>
          )}

          {/* Стрелка потока */}
          {filteredLayers.length > 1 && (
            <g>
              <text x={START_X + (filteredLayers.length - 1) * (LAYER_GAP / 2)} y="28" textAnchor="middle" fill="#555577" fontSize="9">Поток данных →</text>
              <line x1={START_X + 30} y1={23} x2={arrowEndX} y2={23} stroke="#555577" strokeWidth="1" strokeDasharray="4,4" opacity="0.2" />
              <polygon points={`${arrowEndX},21 ${arrowEndX + 5},23 ${arrowEndX},25`} fill="#555577" opacity="0.2" />
            </g>
          )}
        </svg>

        <div style={{
          position: 'absolute', bottom: 4, left: 8, padding: '3px 8px',
          background: 'rgba(18,18,32,0.85)', border: '1px solid #2a2a3e',
          borderRadius: 3, fontSize: 9, color: '#666688', pointerEvents: 'none',
        }}>
          Перетаскивание мышью • / — поиск • Esc — закрыть
        </div>
      </div>

      {/* ===== Навигация по слоям ===== */}
      <LayerNavigation
        layers={filteredLayers}
        hoveredNeuron={hoveredNeuron}
        selectedScrollLayer={selectedScrollLayer}
        onLayerClick={handleScrollLayerClick}
      />

      {/* ===== 3 Примера архитектур ===== */}
      <div style={{
        padding: '8px 16px', borderTop: '1px solid #1a1a2e',
        background: '#0f0f1a', display: 'flex', gap: 10, overflow: 'auto', flexShrink: 0,
      }}>
        <h4 style={{ color: '#8888aa', fontSize: 11, margin: 0, marginRight: 6, alignSelf: 'center', whiteSpace: 'nowrap' }}>
          Примеры:
        </h4>
        <ExampleCard title="BERT" layers="Вход → Эмбеддинг → 12 Трансформер → Выход" details="Кодер-only • 12 слоёв • 768 скрытых • 12 заголовков" color="#ef4444" />
        <ExampleCard title="GPT" layers="Вход → Эмбеддинг → Трансформер → Нормализация → Выход" details="Декодер-only • 12 слоёв • 768 скрытых • 12 заголовков" color="#3b82f6" />
        <ExampleCard title="T5" layers="Кодер → Декодер (cross-attn) → Выход" details="Кодер-Декодер • Текст-в-Текст • Мультизадача" color="#10b981" />
      </div>

      {/* ===== Info Bar ===== */}
      <GGUFInfoBar
        hoveredNeuron={hoveredNeuron}
        layers={filteredLayers.map(l => ({
          name: l.name,
          description: l.description,
          color: l.color,
          neuronCount: l.neuronCount,
        }))}
        architecture={arch}
        parameters={parameters || {}}
      />
    </div>
  );
}

/** Карточка примера архитектуры */
function ExampleCard({ title, layers, details, color }: { title: string; layers: string; details: string; color: string }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
      style={{
        flex: 1, minWidth: 180, padding: '6px 10px',
        background: isHovered ? `${color}15` : '#121220',
        border: `1px solid ${isHovered ? color : '#1e1e30'}`,
        borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: '#e8e8e8' }}>{title}</div>
      </div>
      <div style={{ fontSize: 9, color: '#8888aa', fontFamily: 'monospace', marginBottom: 1 }}>{layers}</div>
      <div style={{ fontSize: 8, color: '#666688' }}>{details}</div>
    </div>
  );
}
