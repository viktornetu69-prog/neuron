import React, { memo } from 'react';

interface LayerNavigationProps {
  layers: Array<{
    name: string;
    shortName: string;
    color: string;
    description: string;
    realSize: number;
  }>;
  hoveredChunk: { layerIndex: number; chunkIndex: number } | null;
  selectedScrollLayer: number | null;
  onLayerClick: (layerIndex: number) => void;
}

/**
 * Навигация по слоям с клавиатурным управлением и ARIA-атрибутами.
 */
export const LayerNavigation = memo<LayerNavigationProps>(({
  layers, hoveredChunk, selectedScrollLayer, onLayerClick,
}) => (
  <nav
    role="navigation"
    aria-label="Навигация по слоям нейронной сети"
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
    }}
  >
    {layers.map((layer, li) => {
      const isSelected = selectedScrollLayer === li;
      const isHoveredLayer = hoveredChunk && hoveredChunk.layerIndex === li;

      return (
        <button
          key={li}
          role="tab"
          aria-selected={isSelected}
          aria-label={`Слой ${li + 1}: ${layer.name}`}
          title={layer.name}
          onClick={() => onLayerClick(li)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onLayerClick(li);
            }
          }}
          style={{
            minWidth: 100,
            padding: '5px 10px',
            background: isSelected ? `${layer.color}22` : '#121220',
            border: `1px solid ${isSelected ? layer.color : isHoveredLayer ? `${layer.color}88` : '#2a2a3e'}`,
            borderRadius: 5,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
            opacity: isHoveredLayer ? 1 : isSelected ? 0.95 : 0.7,
            color: 'inherit',
            fontSize: 'inherit',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: layer.color }}>
            {layer.shortName}
          </div>
          <div style={{
            fontSize: 7,
            color: '#8888aa',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 95,
          }}>
            {layer.name}
          </div>
        </button>
      );
    })}
  </nav>
));

LayerNavigation.displayName = 'LayerNavigation';
