import React, { memo } from 'react';

interface InfoBarProps {
  hoveredNeuron: { layerIndex: number; neuronIndex: number } | null;
  layers: Array<{
    name: string;
    description: string;
    color: string;
  }>;
}

/**
 * Информационная панель при hover на нейрон с ARIA-live.
 */
export const InfoBar = memo<InfoBarProps>(({ hoveredNeuron, layers }) => {
  if (!hoveredNeuron || !layers[hoveredNeuron.layerIndex]) return null;

  const layer = layers[hoveredNeuron.layerIndex];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        padding: '8px 20px',
        borderTop: '1px solid #1a1a2e',
        background: '#0f0f1a',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 8, height: 8, borderRadius: '50%',
          background: layer.color, flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <div style={{ fontSize: 12, fontWeight: 600, color: '#e8e8e8' }}>
        {layer.name} — Нейрон #{hoveredNeuron.neuronIndex + 1}
      </div>
      <div style={{ fontSize: 10, color: '#8888aa' }}>
        {layer.description}
      </div>
    </div>
  );
});

InfoBar.displayName = 'InfoBar';
