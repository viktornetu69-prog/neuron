/**
 * Sidebar — свёрнутая/развёрнутая боковая панель
 * Strip (56px) — только иконки
 * Expanded (204px) — иконки + текст
 */
import React from 'react';

interface SidebarProps {
  expanded: boolean;
  activePanel: string;
  onPanelChange: (panel: string) => void;
  onCheckServer: () => void;
  onToggle: () => void;
  onOpenSettings?: () => void;
}

const BASE_ITEMS = [
  { id: 'chat',    icon: '💬', label: 'Чат' },
  { id: 'models',  icon: '🧠', label: 'Модели' },
  { id: 'datasets', icon: '📊', label: 'Датасеты' },
  { id: 'benchmark',icon: '📈', label: 'Тестирование' },
  { id: 'plugins', icon: '🔌', label: 'Плагины' },
  { id: 'settings',icon: '⚙', label: 'Настройки' },
];

const PLUGINS = [
  { id: 'llm_engine',         icon: '🧠', label: 'LLM Движок' },
  { id: 'visualizer',         icon: '📊', label: 'Визуализация' },
  { id: 'gguf_editor',        icon: '✏️', label: 'GGUF Редактор' },
  { id: 'mcp',                icon: '🔗', label: 'MCP Подключение' },
  { id: 'mcp_server',         icon: '🔧', label: 'MCP Сервер' },
  { id: 'virtual_input',      icon: '⌨️', label: 'Виртуальный Ввод' },
  { id: 'activation_pipeline',icon: '⚡', label: 'Активации' },
  { id: 'answer_comparator',  icon: '📏', label: 'Сравнение' },
  { id: 'auto_fix_engine',    icon: '🔧', label: 'Авто-исправление' },
  { id: 'forecast_engine',    icon: '📈', label: 'Прогнозирование' },
  { id: 'dataset_generator',  icon: '✨', label: 'Генерация Данных' },
  { id: 'dataset_processor',  icon: '📊', label: 'Обработка Данных' },
  { id: 'distillation_trainer',icon: '🎓', label: 'Дистилляция' },
  { id: 'model_converter',    icon: '🔄', label: 'Конвертация' },
  { id: 'preview_server',     icon: '👁', label: 'Предпросмотр' },
  { id: 'quality_assurance',  icon: '✅', label: 'Контроль Качества' },
  { id: 'real_quantizer',     icon: '🗜', label: 'Квантование' },
  { id: 'self_learning',      icon: '📚', label: 'Самообучение' },
  { id: 'stage6_ai',          icon: '🔮', label: 'ИИ Помощник' },
  { id: 'test_framework',     icon: '🧪', label: 'Тестирование' },
];

// ================================================================
// Strip — свёрнутая панель (56px, только иконки BASE)
// ================================================================
function Strip({ activePanel, onPanelChange, onCheckServer, onToggle, onOpenSettings }: {
  activePanel: string;
  onPanelChange: (id: string) => void;
  onCheckServer: () => void;
  onToggle: () => void;
  onOpenSettings?: () => void;
}) {
  return (
    <div style={{
      width: 56,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
      background: '#0f0f1a',
    }}>
      {/* Логотип */}
      <div onClick={onToggle} style={{
        width: 40, height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #7c6ff7 0%, #9d8fff 100%)',
        borderRadius: 10, marginBottom: 16, fontSize: 20, cursor: 'pointer',
      }}>🧠</div>

      {/* Разделитель */}
      <div style={{ width: 32, height: 1, background: '#1a1a2e', marginBottom: 12 }} />

      {/* Навигация — только BASE_ITEMS */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
        padding: '0 8px',
      }}>
        {BASE_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onPanelChange(item.id)}
            title={item.label}
            style={{
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
              background: activePanel === item.id ? 'rgba(124,111,247,0.15)' : 'transparent',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 18,
            }}
          >{item.icon}</button>
        ))}
      </div>

      {/* Разделитель */}
      <div style={{ width: 32, height: 1, background: '#1a1a2e', margin: '8px 0' }} />

      {/* Сервисные кнопки */}
      <button onClick={onCheckServer} title="Проверить сервер" style={{
        width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto', background: 'transparent', border: 'none', borderRadius: 8,
        cursor: 'pointer', fontSize: 16, color: '#8888aa',
      }}>🔍</button>
      <button title="Архив" style={{
        width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto', background: 'transparent', border: 'none', borderRadius: 8,
        cursor: 'pointer', fontSize: 16, color: '#8888aa',
      }}>🗑</button>
      <button onClick={onOpenSettings} title="Настройки" style={{
        width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto', background: 'transparent', border: 'none', borderRadius: 8,
        cursor: 'pointer', fontSize: 16, color: '#8888aa',
      }}>⚙</button>
    </div>
  );
}

// ================================================================
// Expanded — развёрнутая панель (204px, все элементы)
// ================================================================
function Expanded({ activePanel, onPanelChange, allItems }: {
  activePanel: string;
  onPanelChange: (id: string) => void;
  allItems: { id: string; icon: string; label: string; }[];
}) {
  return (
    <div style={{
      width: 204,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '1px solid #1a1a2e',
      background: '#0f0f1a',
    }}>
      {/* Поиск */}
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

      {/* Новый чат */}
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

      {/* Навигация — ВСЕ элементы */}
      <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
        {allItems.map(item => (
          <button
            key={item.id}
            onClick={() => onPanelChange(item.id)}
            title={item.label}
            style={{
              display: 'flex', alignItems: 'center', width: '100%', padding: '10px 12px',
              marginBottom: 2,
              background: activePanel === item.id ? 'rgba(124,111,247,0.15)' : 'transparent',
              border: 'none', borderRadius: 10,
              color: activePanel === item.id ? '#7c6ff7' : '#8888aa',
              cursor: 'pointer', fontSize: 14,
              fontWeight: activePanel === item.id ? 500 : 400,
              textAlign: 'left',
            }}
          >
            <span style={{ marginRight: 12, fontSize: 18 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Архив + Настройки */}
      <div style={{ borderTop: '1px solid #1a1a2e', padding: '8px 8px' }}>
        <button style={{
          width: '100%', height: 36, display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 12px', background: 'transparent', border: 'none', borderRadius: 8,
          cursor: 'pointer', color: '#8888aa', fontSize: 13,
        }}>
          <span>🗑</span> Архив
        </button>
        <button onClick={() => onPanelChange('settings')} style={{
          width: '100%', height: 36, display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 12px', background: 'transparent', border: 'none', borderRadius: 8,
          cursor: 'pointer', color: '#8888aa', fontSize: 13,
        }}>
          <span>⚙</span> Настройки
        </button>
      </div>
    </div>
  );
}

// ================================================================
// Главный компонент Sidebar
// ================================================================
export function Sidebar({ expanded, activePanel, onPanelChange, onCheckServer, onToggle, onOpenSettings }: SidebarProps) {
  const allItems = [...BASE_ITEMS, ...PLUGINS];

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'row',
      background: '#0f0f1a',
      borderRight: '1px solid #1a1a2e',
      flexShrink: 0,
      width: expanded ? 260 : 56,
    }}>
      {!expanded && (
        <Strip
          activePanel={activePanel}
          onPanelChange={onPanelChange}
          onCheckServer={onCheckServer}
          onToggle={onToggle}
          onOpenSettings={onOpenSettings}
        />
      )}
      {expanded && (
        <Expanded
          activePanel={activePanel}
          onPanelChange={onPanelChange}
          allItems={allItems}
        />
      )}
    </div>
  );
}
