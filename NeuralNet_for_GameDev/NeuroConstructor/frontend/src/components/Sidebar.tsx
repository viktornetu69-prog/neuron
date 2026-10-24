import React from 'react';

interface SidebarProps {
  expanded: boolean;
  activePanel: string;
  onPanelChange: (panel: string) => void;
  onCheckServer: () => void;
  onToggle: () => void;
}

const NAV_ITEMS = [
  { id: 'chat', icon: '💬', label: 'Чат' },
  { id: 'models', icon: '🧠', label: 'Модели' },
  { id: 'datasets', icon: '📊', label: 'Датасеты' },
  { id: 'stage6', icon: '⚡', label: 'Stage 6' },
  { id: 'plugins', icon: '🔌', label: 'Плагины' },
];

function Strip({ activePanel, onPanelChange, onCheckServer, onToggle }: Omit<SidebarProps, 'expanded'>) {
  return (
    <div style={{
      width: 56,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
      height: '100%',
    }}>
      <div
        onClick={onToggle}
        style={{
          width: 40, height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #7c6ff7 0%, #9d8fff 100%)',
          borderRadius: 10, marginBottom: 16, fontSize: 20, cursor: 'pointer',
        }}
      >
        🧠
      </div>
      <div style={{ width: 32, height: 1, background: '#1a1a2e', marginBottom: 12 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '0 8px', boxSizing: 'border-box' }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onPanelChange(item.id)}
            title={item.label}
            style={{
              width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto', background: activePanel === item.id ? 'rgba(124, 111, 247, 0.15)' : 'transparent',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 18,
            }}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <div style={{ width: 32, height: 1, background: '#1a1a2e', margin: '8px 0' }} />
      <button
        onClick={onCheckServer}
        title="Проверить сервер"
        style={{
          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto', background: 'transparent', border: 'none', borderRadius: 8,
          cursor: 'pointer', fontSize: 16, color: '#8888aa',
        }}
      />
      {/* Архив */}
      <button
        title="Архив сообщений"
        style={{
          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto', background: 'transparent', border: 'none', borderRadius: 8,
          cursor: 'pointer', fontSize: 16, color: '#8888aa',
        }}
      >
        🗑
      </button>
      {/* Настройки */}
      <button
        title="Настройки"
        style={{
          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto', background: 'transparent', border: 'none', borderRadius: 8,
          cursor: 'pointer', fontSize: 16, color: '#8888aa',
        }}
      >
        ⚙
      </button>
    </div>
  );
}

function ExpandedPanel({ activePanel, onPanelChange }: Omit<SidebarProps, 'onCheckServer' | 'onToggle'>) {
  return (
    <div style={{
      width: 204,
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '1px solid #1a1a2e',
    }}>
      <div style={{ padding: '16px 16px 12px 16px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{ position: 'absolute', left: 12, fontSize: 14, color: '#8888aa' }}>🔍</span>
          <input
            type="text"
            placeholder="Поиск..."
            style={{
              width: '100%', padding: '10px 12px 10px 36px',
              background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 10,
              color: '#e8e8e8', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
      <div style={{ padding: '0 16px 12px 16px' }}>
        <button
          onClick={() => onPanelChange('chat')}
          style={{
            width: '100%', padding: '12px 16px',
            background: 'linear-gradient(135deg, #7c6ff7 0%, #9d8fff 100%)',
            border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>+</span> Новый чат
        </button>
      </div>
      <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onPanelChange(item.id)}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', padding: '10px 12px',
              marginBottom: 2, background: activePanel === item.id ? 'rgba(124, 111, 247, 0.15)' : 'transparent',
              border: 'none', borderRadius: 10, color: activePanel === item.id ? '#7c6ff7' : '#8888aa',
              cursor: 'pointer', fontSize: 14, fontWeight: activePanel === item.id ? 500 : 400,
              textAlign: 'left',
            }}
          >
            <span style={{ marginRight: 12, fontSize: 18 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div style={{ borderTop: '1px solid #1a1a2e', padding: '8px 8px' }}>
        <button style={{
          width: '100%', height: 36, display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 12px', background: 'transparent', border: 'none', borderRadius: 8,
          cursor: 'pointer', color: '#8888aa', fontSize: 13, fontWeight: 400, textAlign: 'left',
        }}>
          <span style={{ fontSize: 16 }}>🗑</span> Архив
        </button>
        <button style={{
          width: '100%', height: 36, display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 12px', background: 'transparent', border: 'none', borderRadius: 8,
          cursor: 'pointer', color: '#8888aa', fontSize: 13, fontWeight: 400, textAlign: 'left',
        }}>
          <span style={{ fontSize: 16 }}>⚙</span> Настройки
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ expanded, activePanel, onPanelChange, onCheckServer, onToggle }: SidebarProps) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'row',
      background: '#0f0f1a',
      borderRight: '1px solid #1a1a2e',
      flexShrink: 0,
      overflow: 'hidden',
      transition: 'width 0.25s ease',
      width: expanded ? 260 : 56,
    }}>
      {!expanded && <Strip activePanel={activePanel} onPanelChange={onPanelChange} onCheckServer={onCheckServer} onToggle={onToggle} />}
      {expanded && <ExpandedPanel activePanel={activePanel} onPanelChange={onPanelChange} />}
    </div>
  );
}
