/**
 * GGUFInfoBar — информационная панель внизу визуализатора
 * (упрощена: чанк-система удалена)
 */

import React, { memo } from 'react';

interface GGUFInfoBarProps {
  layers: Array<{
    name: string;
    description: string;
    color: string;
    realSize: number;
  }>;
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
  parameters: {
    estimated_total_params?: number;
    tensor_count?: number;
    file_size_gb?: number;
  };
}

function formatNumber(num?: number): string {
  if (!num) return 'N/A';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
  return num.toString();
}

const GGUFInfoBar: React.FC<GGUFInfoBarProps> = memo(({
  layers,
  parameters,
}) => (
  <div
    role="status"
    aria-live="polite"
    style={{
      padding: '10px 20px',
      borderTop: '1px solid #1a1a2e',
      background: '#0f0f1a',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexShrink: 0,
      minHeight: 36,
    }}
  >
    <span style={{ fontSize: 11, color: '#666688' }}>
      {layers.length} слоёв • {formatNumber(parameters?.estimated_total_params)} параметров
    </span>
  </div>
));

GGUFInfoBar.displayName = 'GGUFInfoBar';

export default GGUFInfoBar;
