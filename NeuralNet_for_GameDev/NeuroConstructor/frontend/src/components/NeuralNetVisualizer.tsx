import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

interface NeuralNetVisualizerProps {
  architecture: {
    model_family?: string;
    vocab_size?: number;
    hidden_size?: number;
    num_layers?: number;
    num_heads?: number;
    num_kv_heads?: number;
    head_dim?: number;
    max_position_embeddings?: number;
    rope_theta?: number;
  };
  parameters?: {
    estimated_total_params?: number;
    tensor_count?: number;
    file_size_gb?: number;
  };
}

interface LayerConfig {
  name: string;
  shortName: string;
  neuronCount: number;
  color: string;
  colorLight: string;
  colorDark: string;
  description: string;
}

const FALLBACK = { model_family: 'unknown', vocab_size: 30522, hidden_size: 768, num_layers: 4, num_heads: 12, num_kv_heads: 12, head_dim: 64, max_position_embeddings: 512, rope_theta: 10000 };

export function NeuralNetVisualizer({ architecture, parameters }: NeuralNetVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 700 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNeuron, setHoveredNeuron] = useState<{ layerIndex: number; neuronIndex: number } | null>(null);
  const [userPanned, setUserPanned] = useState(false);
  const [selectedScrollLayer, setSelectedScrollLayer] = useState<number | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  const arch = architecture && Object.keys(architecture).length > 0 ? architecture : FALLBACK;

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
    return num.toString();
  };

  const layers = useMemo<LayerConfig[]>(() => {
    const vocabSize = arch.vocab_size || 30522;
    const hiddenSize = arch.hidden_size || 768;
    const numLayers = arch.num_layers || 4;
    const heads = arch.num_heads || 12;
    const headDim = arch.head_dim || Math.round(hiddenSize / heads);

    const inputNeurons = Math.min(10, Math.max(6, Math.ceil(Math.log2(vocabSize + 1))));
    const hiddenNeurons = Math.min(10, Math.max(6, Math.ceil(Math.log2(hiddenSize + 1))));

    const result: LayerConfig[] = [
      { name: 'Input Embeddings (Токенизация)', shortName: 'Вход', neuronCount: inputNeurons, color: '#ff9800', colorLight: '#ffb74d', colorDark: '#e65100', description: `${formatNumber(vocabSize)} токенов, ${hiddenSize} dim` },
    ];

    for (let i = 0; i < numLayers; i++) {
      result.push({
        name: `Layer ${i + 1}/${numLayers}`,
        shortName: `L${i + 1}`,
        neuronCount: hiddenNeurons,
        color: i % 2 === 0 ? '#4caf50' : '#2196f3',
        colorLight: i % 2 === 0 ? '#66bb6a' : '#64b5f6',
        colorDark: i % 2 === 0 ? '#2e7d32' : '#1565c0',
        description: `${heads}h × ${headDim}d`,
      });
    }

    result.push({ name: 'LM Head (Вероятности)', shortName: 'Выход', neuronCount: inputNeurons, color: '#ff5722', colorLight: '#ff8a65', colorDark: '#d84315', description: `${formatNumber(vocabSize)} классов` });
    return result;
  }, [arch]);

  // Layout: каждый слой на своём месте, gap фиксированный
  const layout = useMemo(() => {
    const layerGap = 140;
    const startX = 80;
    const centerY = 280;
    const positions: Array<{ x: number; y: number; layerIndex: number; neuronIndex: number }> = [];

    layers.forEach((layer, layerIndex) => {
      const x = startX + layerIndex * layerGap;
      const neuronGap = Math.min(48, Math.max(28, 380 / Math.max(layer.neuronCount, 2)));
      const startY = centerY - ((layer.neuronCount - 1) * neuronGap) / 2;
      for (let i = 0; i < layer.neuronCount; i++) {
        positions.push({ x, y: startY + i * neuronGap, layerIndex, neuronIndex: i });
      }
    });

    const minX = Math.min(...positions.map(n => n.x)) - 80;
    const maxX = Math.max(...positions.map(n => n.x)) + 80;
    const minY = Math.min(...positions.map(n => n.y)) - 50;
    const maxY = Math.max(...positions.map(n => n.y)) + 50;

    return { positions, minX, maxX, minY, maxY, contentWidth: maxX - minX, contentHeight: maxY - minY };
  }, [layers]);

  // Auto-fit
  const autoFit = useMemo(() => {
    const w = containerSize.width;
    const h = containerSize.height - 60; // минус нижняя панель
    const s = Math.min(w / layout.contentWidth, h / layout.contentHeight, 1.1);
    return {
      scale: s,
      panX: (w - layout.contentWidth * s) / 2 - layout.minX * s,
      panY: (h - layout.contentHeight * s) / 2 - layout.minY * s + 10,
    };
  }, [layout, containerSize]);

  const displayPan = userPanned ? pan : { x: autoFit.panX, y: autoFit.panY };
  const displayZoom = userPanned ? zoom : autoFit.scale;

  const zoomIn = useCallback(() => setZoom(z => Math.min(3, z + 0.2)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(0.1, z - 0.2)), []);
  const resetAll = useCallback(() => { setUserPanned(false); setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setUserPanned(true);
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.1, Math.min(3, prev + delta)));
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
        const { clientWidth, clientHeight } = containerRef.current;
        setContainerSize({ width: clientWidth, height: clientHeight });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Навигация по скроллу слоёв
  const handleScrollLayerClick = (li: number) => {
    setSelectedScrollLayer(li);
    setUserPanned(true);
    const layerPositions = layout.positions.filter(n => n.layerIndex === li);
    if (layerPositions.length === 0) return;
    const cx = layerPositions[0].x;
    const cy = layerPositions[0].y;
    const targetX = -cx * displayZoom + containerSize.width / 2;
    const targetY = -cy * displayZoom + containerSize.height / 2;
    setPan({ x: targetX, y: targetY });
  };

  // Наведение на нейрон — подсвечиваем ТОЛЬКО его связи
  const handleNeuronHover = (li: number, ni: number) => setHoveredNeuron({ layerIndex: li, neuronIndex: ni });
  const handleNeuronLeave = () => setHoveredNeuron(null);

  const totalWidth = layout.contentWidth;
  const arrowEndX = 80 + (layers.length - 1) * 140 + 50;

  return (
    <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0a0f', userSelect: 'none' }}>
      {/* Header */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid #1a1a2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f0f1a', flexShrink: 0 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#e8e8e8', margin: 0 }}>
            🧠 {((arch.model_family || 'unknown').toUpperCase())}
          </h3>
          <div style={{ fontSize: 11, color: '#8888aa', marginTop: 2 }}>
            {layers.length} слоёв • {layout.positions.length} нейронов • <span style={{ color: '#7c6ff7', fontWeight: 600 }}>{parameters?.estimated_total_params ? formatNumber(parameters.estimated_total_params) : 'N/A'} параметров</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={zoomOut} title="Уменьшить"
            style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 4, color: '#ccc', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>−</button>
          <span style={{ fontSize: 10, color: '#8888aa', minWidth: 36, textAlign: 'center' }}>
            {Math.round(displayZoom * 100)}%
          </span>
          <button onClick={zoomIn} title="Увеличить"
            style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 4, color: '#ccc', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>+</button>
          <button onClick={resetAll}
            style={{ padding: '3px 10px', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 4, color: '#8888aa', cursor: 'pointer', fontSize: 11 }}>⟲</button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', cursor: isDragging ? 'move' : 'grab' }}
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <svg width={containerSize.width} height={containerSize.height}
          style={{ position: 'absolute', top: 0, left: 0,
            transform: `translate(${displayPan.x}px,${displayPan.y}px) scale(${displayZoom})`,
            transformOrigin: '0 0' }}>

          <defs>
            {layers.map((layer, idx) => (
              <React.Fragment key={idx}>
                <radialGradient id={`ng${idx}`} cx="40%" cy="35%">
                  <stop offset="0%" stopColor={layer.colorLight} />
                  <stop offset="60%" stopColor={layer.color} />
                  <stop offset="100%" stopColor={layer.colorDark} />
                </radialGradient>
                <filter id={`gf${idx}`} x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </React.Fragment>
            ))}
          </defs>

          {/* Все связи — затемнённые */}
          {layers.map((layer, li) => {
            if (li >= layers.length - 1) return null;
            const cur = layout.positions.filter(n => n.layerIndex === li);
            const nxt = layout.positions.filter(n => n.layerIndex === li + 1);
            return cur.map((from, fi) =>
              nxt.map((to, tj) => {
                const hl = hoveredNeuron && hoveredNeuron.layerIndex === li && hoveredNeuron.neuronIndex === fi;
                const hl2 = hoveredNeuron && hoveredNeuron.layerIndex === li + 1;
                return (
                  <line key={`c${li}_${fi}_${tj}`}
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={layer.color}
                    strokeWidth={hl || hl2 ? 1.5 : 0.3}
                    opacity={hl || hl2 ? 0.5 : 0.04} />
                );
              })
            );
          })}

          {/* Нейроны */}
          {layout.positions.map((neuron) => {
            const layer = layers[neuron.layerIndex];
            const idx = neuron.layerIndex;
            const isHovered = hoveredNeuron && hoveredNeuron.layerIndex === idx && hoveredNeuron.neuronIndex === neuron.neuronIndex;
            const dimmed = hoveredNeuron !== null && hoveredNeuron.layerIndex !== idx;
            return (
              <g key={`n${idx}_${neuron.neuronIndex}`}
                onMouseEnter={() => handleNeuronHover(idx, neuron.neuronIndex)}
                onMouseLeave={handleNeuronLeave}
                opacity={dimmed ? 0.1 : 1}
                style={{ transition: 'opacity 0.15s ease' }}>
                <circle cx={neuron.x} cy={neuron.y}
                  r={isHovered ? 15 : 11}
                  fill={`url(#ng${idx})`}
                  stroke={layer.color}
                  strokeWidth={isHovered ? 3 : 2}
                  filter={isHovered ? `url(#gf${idx})` : undefined}
                  style={{ transition: 'r 0.15s ease, stroke-width 0.15s ease' }} />
              </g>
            );
          })}

          {/* Стрелка потока */}
          {layers.length > 1 && (
            <g>
              <text x={80 + (layers.length - 1) * 70} y="36" textAnchor="middle" fill="#555577" fontSize="10">
                Поток данных →
              </text>
              <line x1={120} y1={31} x2={arrowEndX} y2={31} stroke="#555577" strokeWidth="1" strokeDasharray="4,4" opacity="0.25" />
              <polygon points={`${arrowEndX},28 ${arrowEndX + 6},31 ${arrowEndX},34`} fill="#555577" opacity="0.25" />
            </g>
          )}
        </svg>

        <div style={{ position: 'absolute', bottom: 8, left: 12, padding: '4px 10px', background: 'rgba(18,18,32,0.85)', border: '1px solid #2a2a3e', borderRadius: 4, fontSize: 10, color: '#666688', pointerEvents: 'none' }}>
          Перетаскивание мышью
        </div>
      </div>

      {/* Нижняя панель слоёв — горизонтальный скролл */}
      <div
        style={{
          padding: '6px 20px',
          borderTop: '1px solid #1a1a2e',
          background: '#0a0a12',
          display: 'flex',
          gap: 5,
          overflowX: 'auto',
          overflowY: 'hidden',
          flexShrink: 0,
          alignItems: 'center',
          scrollbarWidth: 'thin',
          scrollbarColor: '#2a2a3e #0a0a12',
        }}
        onScroll={(e) => setScrollOffset((e.target as HTMLDivElement).scrollLeft)}
      >
        {layers.map((layer, li) => {
          const isSelected = selectedScrollLayer === li;
          const isHoveredLayer = hoveredNeuron && hoveredNeuron.layerIndex === li;
          return (
            <div
              key={li}
              onClick={() => handleScrollLayerClick(li)}
              onMouseEnter={() => {}}
              style={{
                minWidth: 100,
                padding: '5px 10px',
                background: isSelected ? `${layer.color}22` : '#121220',
                border: `1px solid ${isSelected ? layer.color : isHoveredLayer ? layer.color + '88' : '#2a2a3e'}`,
                borderRadius: 5,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease',
                opacity: isHoveredLayer ? 1 : isSelected ? 0.95 : 0.7,
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, color: layer.color }}>{layer.shortName}</div>
              <div style={{ fontSize: 7, color: '#8888aa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 95 }}>
                {layer.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info bar — показывается при hover на нейрон */}
      {hoveredNeuron && layers[hoveredNeuron.layerIndex] && (
        <div style={{ padding: '8px 20px', borderTop: '1px solid #1a1a2e', background: '#0f0f1a', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: layers[hoveredNeuron.layerIndex].color, flexShrink: 0 }} />
          <div style={{ fontSize: 12, fontWeight: 600, color: '#e8e8e8' }}>
            {layers[hoveredNeuron.layerIndex].name} — Нейрон #{hoveredNeuron.neuronIndex + 1}
          </div>
          <div style={{ fontSize: 10, color: '#8888aa' }}>
            {layers[hoveredNeuron.layerIndex].description}
          </div>
        </div>
      )}
    </div>
  );
}
