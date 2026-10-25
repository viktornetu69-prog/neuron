/**
 * LayerNavigation — навигация по слоям нейронной сети.
 */

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
  panX: number;
  onLayerClick: (layerIndex: number) => void;
}

/**
 * Навигация по слоям с клавиатурным управлением и ARIA-атрибутами.
 * При hover на чанк подсвечивает только соответствующий слой и чанк.
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
      // Подсветка только при hover на чанк этого слоя
      const isChunkHovered = hoveredChunk?.layerIndex === li;
      
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
            background: (isSelected || isChunkHovered) ? `${layer.color}22` : '#121220',
            border: `1px solid ${isSelected || isChunkHovered ? layer.color : '#2a2a3e'}`,
            borderRadius: 5,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
            opacity: (isSelected || isChunkHovered) ? 0.95 : 0.7,
            color: 'inherit',
            fontSize: 'inherit',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: layer.color }}>
            {layer.shortName}
            {isChunkHovered && hoveredChunk !== null && (
              <span style={{ marginLeft: 4, fontSize: 8, opacity: 0.8 }}>
                [{hoveredChunk.chunkIndex + 1}/10]
              </span>
            )}
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
