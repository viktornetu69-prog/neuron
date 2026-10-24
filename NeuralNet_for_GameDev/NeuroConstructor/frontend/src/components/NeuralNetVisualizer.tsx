import React from 'react';

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

export function NeuralNetVisualizer({ architecture, parameters }: NeuralNetVisualizerProps) {
  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
    return num.toString();
  };

  const layers = Math.min(architecture.num_layers || 4, 12);
  const hiddenSize = architecture.hidden_size || 768;
  const numHeads = architecture.num_heads || 12;
  const vocabSize = architecture.vocab_size || 30522;
  const maxContext = architecture.max_position_embeddings || 512;
  const modelFamily = (architecture.model_family || 'llama').toUpperCase();

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: 24,
      background: '#0f0f1a',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontSize: 20,
          fontWeight: 600,
          color: '#e8e8e8',
          marginBottom: 8,
        }}>
          🧠 Архитектура {modelFamily}
        </h2>
        <div style={{
          display: 'flex',
          gap: 16,
          fontSize: 13,
          color: '#8888aa',
          marginBottom: 16,
        }}>
          <span>Параметров: <strong style={{ color: '#7c6ff7' }}>{parameters?.estimated_total_params ? formatNumber(parameters.estimated_total_params) : 'N/A'}</strong></span>
          <span>Размер: <strong style={{ color: '#7c6ff7' }}>{parameters?.file_size_gb ? parameters.file_size_gb.toFixed(2) + ' GB' : 'N/A'}</strong></span>
        </div>
      </div>

      {/* Main Architecture Visualization */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
        marginBottom: 32,
      }}>
        {/* Input Layer */}
        <div style={{
          width: '100%',
          maxWidth: 600,
          padding: 16,
          background: 'linear-gradient(135deg, rgba(124, 111, 247, 0.1) 0%, rgba(157, 143, 255, 0.1) 100%)',
          border: '1px solid #7c6ff7',
          borderRadius: 12,
          marginBottom: 8,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 12, color: '#8888aa', marginBottom: 4 }}>INPUT EMBEDDINGS</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#e8e8e8' }}>Токенизация</div>
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#7c6ff7',
              padding: '4px 12px',
              background: 'rgba(124, 111, 247, 0.2)',
              borderRadius: 8,
            }}>
              {formatNumber(vocabSize)} токенов
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c6ff7', fontSize: 18 }}>
          ↓
        </div>

        {/* Transformer Layers */}
        <div style={{
          width: '100%',
          maxWidth: 600,
          background: '#121220',
          borderRadius: 12,
          border: '1px solid #2a2a3e',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px',
            background: 'rgba(124, 111, 247, 0.05)',
            borderBottom: '1px solid #1e1e30',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e8e8e8' }}>TRANSFORMER LAYERS ({layers})</span>
            <span style={{ fontSize: 12, color: '#8888aa' }}>Каждый слой содержит:</span>
          </div>

          {/* Layer Blocks */}
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: Math.min(layers, 8) }).map((_, i) => (
              <div key={i} style={{
                padding: 12,
                background: i === 0 ? 'rgba(124, 111, 247, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                borderRadius: 8,
                border: i === 0 ? '1px solid rgba(124, 111, 247, 0.3)' : '1px solid #1e1e30',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#e8e8e8' }}>Слой {i + 1}</span>
                  <span style={{ fontSize: 11, color: '#8888aa' }}>Layer #{i + 1}</span>
                </div>
                <div style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                }}>
                  {/* MHA Block */}
                  <div style={{
                    flex: 1,
                    minWidth: 140,
                    padding: 8,
                    background: 'rgba(76, 175, 80, 0.1)',
                    border: '1px solid rgba(76, 175, 80, 0.3)',
                    borderRadius: 6,
                  }}>
                    <div style={{ fontSize: 11, color: '#4caf50', marginBottom: 4, fontWeight: 600 }}>MHA</div>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>{numHeads} heads × {architecture.head_dim || hiddenSize / numHeads} dim</div>
                  </div>
                  {/* FFN Block */}
                  <div style={{
                    flex: 1,
                    minWidth: 140,
                    padding: 8,
                    background: 'rgba(255, 152, 0, 0.1)',
                    border: '1px solid rgba(255, 152, 0, 0.3)',
                    borderRadius: 6,
                  }}>
                    <div style={{ fontSize: 11, color: '#ff9800', marginBottom: 4, fontWeight: 600 }}>FFN</div>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>{hiddenSize} → {hiddenSize * 4} → {hiddenSize}</div>
                  </div>
                </div>
              </div>
            ))}

            {layers > 8 && (
              <div style={{
                textAlign: 'center',
                padding: 8,
                color: '#8888aa',
                fontSize: 12,
              }}>
                + {layers - 8} слоёв...
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c6ff7', fontSize: 18 }}>
          ↓
        </div>

        {/* Layer Output */}
        <div style={{
          width: '100%',
          maxWidth: 600,
          padding: 16,
          background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(102, 187, 106, 0.1) 100%)',
          border: '1px solid #4caf50',
          borderRadius: 12,
          marginBottom: 8,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 12, color: '#8888aa', marginBottom: 4 }}>HIDDEN STATE</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#e8e8e8' }}>Output Embeddings</div>
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#4caf50',
              padding: '4px 12px',
              background: 'rgba(76, 175, 80, 0.2)',
              borderRadius: 8,
            }}>
              {hiddenSize} dim
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c6ff7', fontSize: 18 }}>
          ↓
        </div>

        {/* Output Layer */}
        <div style={{
          width: '100%',
          maxWidth: 600,
          padding: 16,
          background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 183, 77, 0.1) 100%)',
          border: '1px solid #ff9800',
          borderRadius: 12,
          marginTop: 8,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 12, color: '#8888aa', marginBottom: 4 }}>LM HEAD</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#e8e8e8' }}>Вероятности токенов</div>
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#ff9800',
              padding: '4px 12px',
              background: 'rgba(255, 152, 0, 0.2)',
              borderRadius: 8,
            }}>
              {formatNumber(vocabSize)} классов
            </div>
          </div>
        </div>
      </div>

      {/* Key Parameters Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        <div style={{
          padding: 12,
          background: '#121220',
          borderRadius: 8,
          border: '1px solid #1e1e30',
        }}>
          <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Hidden Size</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#7c6ff7' }}>{hiddenSize.toLocaleString()}</div>
        </div>
        <div style={{
          padding: 12,
          background: '#121220',
          borderRadius: 8,
          border: '1px solid #1e1e30',
        }}>
          <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Слои</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#4caf50' }}>{layers}</div>
        </div>
        <div style={{
          padding: 12,
          background: '#121220',
          borderRadius: 8,
          border: '1px solid #1e1e30',
        }}>
          <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Головки</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#ff9800' }}>{numHeads}</div>
        </div>
        <div style={{
          padding: 12,
          background: '#121220',
          borderRadius: 8,
          border: '1px solid #1e1e30',
        }}>
          <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Max Context</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e8e8e8' }}>{formatNumber(maxContext)}</div>
        </div>
        <div style={{
          padding: 12,
          background: '#121220',
          borderRadius: 8,
          border: '1px solid #1e1e30',
        }}>
          <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>Head Dim</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e8e8e8' }}>{architecture.head_dim || Math.round(hiddenSize / numHeads)}</div>
        </div>
        <div style={{
          padding: 12,
          background: '#121220',
          borderRadius: 8,
          border: '1px solid #1e1e30',
        }}>
          <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>KV Heads</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e8e8e8' }}>{architecture.num_kv_heads || numHeads}</div>
        </div>
      </div>

      {/* Attention Mechanism Visualization */}
      <div style={{
        padding: 16,
        background: '#121220',
        borderRadius: 12,
        border: '1px solid #1e1e30',
        marginBottom: 24,
      }}>
        <h3 style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#e8e8e8',
          marginBottom: 12,
        }}>Механизм внимания</h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {Array.from({ length: Math.min(numHeads, 16) }).map((_, i) => (
            <div key={i} style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: `linear-gradient(135deg, rgba(124, 111, 247, ${0.3 + (i / numHeads) * 0.7}) 0%, rgba(157, 143, 255, ${0.3 + (i / numHeads) * 0.7}) 100%)`,
              border: '1px solid rgba(124, 111, 247, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
              color: '#e8e8e8',
              transition: 'transform 0.2s',
            }}>
              H{i + 1}
            </div>
          ))}
          {numHeads > 16 && (
            <div style={{
              fontSize: 12,
              color: '#8888aa',
              marginLeft: 8,
            }}>
              +{numHeads - 16}
            </div>
          )}
        </div>
      </div>

      {/* Positional Encoding */}
      <div style={{
        padding: 16,
        background: '#121220',
        borderRadius: 12,
        border: '1px solid #1e1e30',
      }}>
        <h3 style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#e8e8e8',
          marginBottom: 12,
        }}>RoPE Positional Encoding</h3>
        <div style={{
          height: 60,
          background: 'linear-gradient(90deg, rgba(124, 111, 247, 0.1) 0%, rgba(76, 175, 80, 0.1) 50%, rgba(255, 152, 0, 0.1) 100%)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          overflow: 'hidden',
        }}>
          {Array.from({ length: Math.min(maxContext, 50) }).map((_, i) => (
            <div key={i} style={{
              width: 2,
              height: `${20 + Math.sin(i * 0.5) * 30 + Math.random() * 20}%`,
              background: `linear-gradient(to top, #7c6ff7, #9d8fff)`,
              borderRadius: 1,
              opacity: 0.6 + Math.random() * 0.4,
            }} />
          ))}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          fontSize: 11,
          color: '#8888aa',
        }}>
          <span>0</span>
          <span>RoPE θ = {architecture.rope_theta?.toLocaleString() || 'N/A'}</span>
          <span>{maxContext}</span>
        </div>
      </div>
    </div>
  );
}
