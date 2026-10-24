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

interface Layer {
  name: string;
  neurons: number;
  color: string;
  gradient: [string, string];
}

export function NeuralNetVisualizer({ architecture, parameters }: NeuralNetVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [hoveredLayer, setHoveredLayer] = useState<number | null>(null);

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
    return num.toString();
  };

  // Определяем слои сети на основе архитектуры
  const layers = useMemo<Layer[]>(() => {
    const result: Layer[] = [
      {
        name: 'Входной слой\n(Токенизация)',
        neurons: Math.min(8, Math.max(5, Math.ceil((architecture.vocab_size || 30522) / 10000))),
        color: '#ff9800',
        gradient: ['#ff9800', '#ffb74d'],
      },
    ];

    const numHiddenLayers = Math.min(architecture.num_layers || 4, 12);
    const hiddenSize = architecture.hidden_size || 768;

    for (let i = 0; i < numHiddenLayers; i++) {
      result.push({
        name: `Скрытый слой ${i + 1}\n(Transformer Block)`,
        neurons: Math.min(8, Math.max(5, Math.ceil(hiddenSize / 256))),
        color: i === 0 ? '#4caf50' : '#2196f3',
        gradient: i === 0 ? ['#4caf50', '#66bb6a'] : ['#2196f3', '#64b5f6'],
      });
    }

    result.push({
      name: 'Выходной слой\n(LM Head)',
      neurons: Math.min(8, Math.max(5, Math.ceil((architecture.vocab_size || 30522) / 10000))),
      color: '#ff9800',
      gradient: ['#ff9800', '#ffb74d'],
    });

    return result;
  }, [architecture.vocab_size, architecture.num_layers, architecture.hidden_size]);

  // Вычисляем позиции нейронов
  const getNeuronPositions = useCallback(() => {
    const positions: Array<{ x: number; y: number; layerIndex: number; neuronIndex: number }> = [];
    const layerGap = (dimensions.width - 200) / (layers.length - 1);

    layers.forEach((layer, layerIndex) => {
      const x = 100 + layerIndex * layerGap;
      const neuronGap = Math.min(80, (dimensions.height - 100) / Math.max(layer.neurons, 2));
      const startY = dimensions.height / 2 - ((layer.neurons - 1) * neuronGap) / 2;

      for (let i = 0; i < layer.neurons; i++) {
        positions.push({
          x,
          y: startY + i * neuronGap,
          layerIndex,
          neuronIndex: i,
        });
      }
    });

    return positions;
  }, [layers, dimensions]);

  const neuronPositions = getNeuronPositions();

  // Обработчики для перетаскивания
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    // Реайзайз
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        const parent = svgRef.current.parentElement;
        setDimensions({
          width: parent.clientWidth,
          height: parent.clientHeight,
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalWidth = 100 + (layers.length - 1) * 200 + 100;
  const totalHeight = 600;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#0a0a0f',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #1a1a2e',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#0f0f1a',
      }}>
        <div>
          <h3 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#e8e8e8',
            margin: 0,
          }}>
            🧠 {((architecture.model_family || 'llama').toUpperCase())} Архитектура
          </h3>
          <div style={{
            fontSize: 12,
            color: '#8888aa',
            marginTop: 4,
          }}>
            Параметры: <span style={{ color: '#7c6ff7', fontWeight: 600 }}>{parameters?.estimated_total_params ? formatNumber(parameters.estimated_total_params) : 'N/A'}</span>
            {' • '}
            Размер: <span style={{ color: '#7c6ff7', fontWeight: 600 }}>{parameters?.file_size_gb ? parameters.file_size_gb.toFixed(2) + ' GB' : 'N/A'}</span>
          </div>
        </div>
        <div style={{
          fontSize: 11,
          color: '#555577',
          fontStyle: 'italic',
        }}>
          Перетаскивайте холст мышью для просмотра
        </div>
      </div>

      {/* Canvas */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
          }}
        >
          <defs>
            {layers.map((layer, idx) => (
              <linearGradient key={idx} id={`grad${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={layer.gradient[0]} stopOpacity="0.8" />
                <stop offset="100%" stopColor={layer.gradient[1]} stopOpacity="0.6" />
              </linearGradient>
            ))}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Связи между слоями */}
          {layers.map((layer, layerIndex) => {
            if (layerIndex === layers.length - 1) return null;

            const currentLayerNeurons = neuronPositions.filter(n => n.layerIndex === layerIndex);
            const nextLayerNeurons = neuronPositions.filter(n => n.layerIndex === layerIndex + 1);

            const connections = currentLayerNeurons.flatMap((fromNeuron, i) =>
              nextLayerNeurons.map((toNeuron, j) => (
                <line
                  key={`${layerIndex}-${i}-${j}`}
                  x1={fromNeuron.x}
                  y1={fromNeuron.y}
                  x2={toNeuron.x}
                  y2={toNeuron.y}
                  stroke={`${layer.color}33`}
                  strokeWidth="1"
                  opacity={hoveredLayer === layerIndex || hoveredLayer === layerIndex + 1 ? 0.6 : 0.15}
                  style={{ transition: 'opacity 0.3s ease' }}
                />
              ))
            );
            return connections;
          })}

          {/* Нейроны */}
          {neuronPositions.map((neuron) => {
            const layer = layers[neuron.layerIndex];
            return (
              <g
                key={`neuron-${neuron.layerIndex}-${neuron.neuronIndex}`}
                onMouseEnter={() => setHoveredLayer(neuron.layerIndex)}
                onMouseLeave={() => setHoveredLayer(null)}
              >
                {/* Внешнее свечение */}
                <circle
                  cx={neuron.x}
                  cy={neuron.y}
                  r="14"
                  fill="none"
                  stroke={layer.color}
                  strokeWidth="2"
                  opacity="0.3"
                />
                {/* Основной круг */}
                <circle
                  cx={neuron.x}
                  cy={neuron.y}
                  r="12"
                  fill={`url(#grad${neuron.layerIndex})`}
                  stroke={layer.color}
                  strokeWidth="2"
                  filter="url(#glow)"
                />
              </g>
            );
          })}

          {/* Подписи слоёв */}
          {layers.map((layer, layerIndex) => {
            const layerNeurons = neuronPositions.filter(n => n.layerIndex === layerIndex);
            if (layerNeurons.length === 0) return null;
            const firstNeuron = layerNeurons[0];

            return (
              <g key={`label-${layerIndex}`}>
                {/* Название слоя слева */}
                <text
                  x={firstNeuron.x - 40}
                  y={firstNeuron.y}
                  fill={layer.color}
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="end"
                  dominantBaseline="middle"
                  opacity={hoveredLayer === layerIndex ? 1 : 0.7}
                >
                  {layer.name.split('\n')[0]}
                </text>
                {/* Подпись под первым нейроном */}
                <text
                  x={firstNeuron.x}
                  y={firstNeuron.y + 24}
                  fill="#8888aa"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {layer.name.split('\n')[1]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Stats */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid #1a1a2e',
        background: '#0a0a0f',
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{
          padding: '8px 12px',
          background: '#121220',
          borderRadius: 8,
          border: '1px solid #1e1e30',
          minWidth: 120,
        }}>
          <div style={{ fontSize: 10, color: '#8888aa', marginBottom: 2 }}>Hidden Size</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#7c6ff7' }}>{(architecture.hidden_size || 768).toLocaleString()}</div>
        </div>
        <div style={{
          padding: '8px 12px',
          background: '#121220',
          borderRadius: 8,
          border: '1px solid #1e1e30',
          minWidth: 120,
        }}>
          <div style={{ fontSize: 10, color: '#8888aa', marginBottom: 2 }}>Слои</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#4caf50' }}>{architecture.num_layers || 4}</div>
        </div>
        <div style={{
          padding: '8px 12px',
          background: '#121220',
          borderRadius: 8,
          border: '1px solid #1e1e30',
          minWidth: 120,
        }}>
          <div style={{ fontSize: 10, color: '#8888aa', marginBottom: 2 }}>Головки</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#ff9800' }}>{architecture.num_heads || 12}</div>
        </div>
        <div style={{
          padding: '8px 12px',
          background: '#121220',
          borderRadius: 8,
          border: '1px solid #1e1e30',
          minWidth: 120,
        }}>
          <div style={{ fontSize: 10, color: '#8888aa', marginBottom: 2 }}>Max Context</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e8e8e8' }}>{formatNumber(architecture.max_position_embeddings || 512)}</div>
        </div>
      </div>
    </div>
  );
}
