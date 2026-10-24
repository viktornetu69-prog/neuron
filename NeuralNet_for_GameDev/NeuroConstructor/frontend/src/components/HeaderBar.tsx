import React from 'react';

interface HeaderBarProps {
  onToggleSidebar: () => void;
  isSidebarExpanded: boolean;
  onTogglePreview: () => void;
  isPreviewOpen: boolean;
}

export function HeaderBar({ onToggleSidebar, isSidebarExpanded, onTogglePreview, isPreviewOpen }: HeaderBarProps) {
  return (
    <div style={{
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      background: '#0f0f1a',
      borderBottom: '1px solid #1a1a2e',
      flexShrink: 0,
      whiteSpace: 'nowrap',
    }}>
      {/* Left: toggle button */}
      <button
        onClick={onToggleSidebar}
        title={isSidebarExpanded ? 'Свернуть панель' : 'Развернуть панель'}
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          color: '#8888aa',
          fontSize: 18,
          flexShrink: 0,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = '#1a1a2e';
          (e.currentTarget as HTMLButtonElement).style.color = '#e8e8e8';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = '#8888aa';
        }}
      >
        ◫
      </button>

      {/* Center: chat title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 14,
        color: '#e8e8e8',
        fontWeight: 500,
        overflow: 'hidden',
        flex: 1,
        justifyContent: 'flex-start',
        marginLeft: 8,
      }}>
        <span>Новый чат</span>
        <span style={{ color: '#8888aa' }}>•••</span>
      </div>

      {/* Right: preview button */}
      <button
        onClick={onTogglePreview}
        title="Предпросмотр"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: isPreviewOpen ? 'rgba(124, 111, 247, 0.15)' : '#1a1a2e',
          border: '1px solid #2a2a3e',
          borderRadius: 8,
          color: isPreviewOpen ? '#7c6ff7' : '#8888aa',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          flexShrink: 0,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#7c6ff7';
          (e.currentTarget as HTMLButtonElement).style.color = '#e8e8e8';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a3e';
          (e.currentTarget as HTMLButtonElement).style.color = isPreviewOpen ? '#7c6ff7' : '#8888aa';
        }}
      >
        <span style={{ fontSize: 14 }}>▶</span>
        Предпросмотр
      </button>
    </div>
  );
}
