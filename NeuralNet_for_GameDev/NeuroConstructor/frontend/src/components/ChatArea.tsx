import { KeyboardEvent, useState, useCallback, useRef } from 'react';
import { Toast, ContextMenu } from './Toast';
import { ChatMode, ChatMessage } from '@/types';

const STORAGE_KEY = 'neuroconstructor_settings_v2';

// Helper: read settings from localStorage
function getSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

interface ChatAreaProps {
  messages: ChatMessage[];
  inputText: string;
  onInputTextChange: (text: string) => void;
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  isLoading: boolean;
  isServerAvailable: boolean;
  chatMode: ChatMode;
  onExportHistory?: () => void;
  isStreaming?: boolean; // Показывать процесс "мышления"
}

interface ThinkingState {
  isThinking: boolean;
  currentText: string;
}

export function ChatArea({
  messages,
  inputText,
  onInputTextChange,
  onSendMessage,
  onClearChat,
  isLoading,
  isServerAvailable,
  chatMode,
  onExportHistory,
  isStreaming = true,
}: ChatAreaProps) {
  const [toast, setToast] = useState({ visible: false, message: '', position: { x: 0, y: 0 } });
  const [contextMenu, setContextMenu] = useState({ visible: false, position: { x: 0, y: 0 } });
  const messageRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((x: number, y: number) => {
    setToast({ visible: true, message: 'Текст скопирован', position: { x, y } });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 1500);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, text: string) => {
    e.preventDefault();
    setContextMenu({ visible: true, position: { x: e.clientX, y: e.clientY } });

    const handleCopy = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString() || text;

      navigator.clipboard.writeText(selectedText).catch(console.error);
      showToast(e.clientX, e.clientY);
      setContextMenu({ visible: false, position: { x: 0, y: 0 } });
    };

    const handleGlobalClick = () => {
      document.removeEventListener('click', handleGlobalClick);
      setContextMenu({ visible: false, position: { x: 0, y: 0 } });
    };

    setTimeout(() => {
      document.addEventListener('click', handleGlobalClick);
    }, 0);

    handleCopy();
  }, [showToast]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (messageRef.current && !messageRef.current.contains(e.target as Node)) {
      setContextMenu({ visible: false, position: { x: 0, y: 0 } });
    }
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage(inputText);
    }
  };

  // Определяем placeholder в зависимости от режима
  const getPlaceholder = () => {
    const settings = getSettings();
    const defaults: Record<ChatMode, string> = {
      'human-teacher': 'Спросите учителя...',
      'human-student': 'Спросите студента...',
      'human-teacher-student': 'Задайте вопрос для сравнения ответов...',
      'teacher-student': 'Введите тему для обсуждения учителя и студента...',
    };
    return settings?.chatPlaceholders?.[chatMode] || defaults[chatMode];
  };

  // Определяем заголовок режима
  const getModeTitle = () => {
    switch (chatMode) {
      case 'human-teacher':
        return '💬 Человек ↔ Учитель';
      case 'human-student':
        return '🎓 Человек ↔ Студент';
      case 'human-teacher-student':
        return '🤝 Человек ↔ Учитель + Студент';
      case 'teacher-student':
        return '⚔️ Учитель ↔ Студент';
      default:
        return '💬 Чат';
    }
  };

  // Определяем иконку роли из настроек
  const getRoleIcon = (role: string) => {
    const settings = getSettings();
    const defaults: Record<string, string> = {
      human: '👤',
      teacher: '👨‍🏫',
      student: '🎓',
    };
    return settings?.chatRoleIcons?.[role] || defaults[role] || '💬';
  };

  // Определяем цвет роли из настроек
  const getRoleColor = (role: string) => {
    const settings = getSettings();
    const defaults: Record<string, string> = {
      human: '#8888aa',
      teacher: '#4caf50',
      student: '#7c6ff7',
    };
    return settings?.chatRoleColors?.[role] || defaults[role] || '#8888aa';
  };

  return (
    <>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#0a0a0f',
          userSelect: 'text' as const,
          WebkitUserSelect: 'text',
        }}
        onClick={handleClick}
      >
        {/* Chat Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #1e1e30',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#e8e8e8' }}>
              {getModeTitle()}
            </h2>
            <p style={{ fontSize: 12, color: '#8888aa', margin: 0 }}>
              {messages.length} сообщений
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {chatMode === 'teacher-student' && onExportHistory && (
              <button
                onClick={onExportHistory}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid #1e1e30',
                  borderRadius: 6,
                  color: '#8888aa',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                📥 Экспорт
              </button>
            )}
            <button
              onClick={onClearChat}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid #1e1e30',
                borderRadius: 6,
                color: '#8888aa',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Очистить
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={messageRef} style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
        }}>
          {messages.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#8888aa',
            }}>
              <p style={{ fontSize: 14, marginBottom: 16 }}>
                {chatMode === 'teacher-student'
                  ? 'Модели начнут диалог после вашей темы'
                  : 'Отправьте сообщение чтобы начать...'}
              </p>
              {!isServerAvailable && (
                <p style={{ fontSize: 12, color: '#f44336' }}>
                  ⚠️ Сервер недоступен
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map((msg, index) => (
                <MessageBubble
                  key={index}
                  message={msg}
                  onContextMenu={handleContextMenu}
                  roleIcon={getRoleIcon(msg.role)}
                  roleColor={getRoleColor(msg.role)}
                />
              ))}
              {isLoading && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  background: '#121220',
                  borderRadius: 12,
                  maxWidth: '70%',
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#7c6ff7',
                    animation: 'pulse 1.5s infinite',
                  }} />
                  <span style={{ fontSize: 13, color: '#8888aa' }}>Думаю...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #1e1e30',
          background: '#121220',
        }}>
          <div style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}>
            <input
              type="text"
              value={inputText}
              onChange={e => onInputTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: '#1a1a2e',
                border: '1px solid #1e1e30',
                borderRadius: 10,
                color: '#e8e8e8',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <button
              onClick={() => onSendMessage(inputText)}
              disabled={isLoading || !inputText.trim()}
              style={{
                padding: '12px 20px',
                background: inputText.trim() ? '#7c6ff7' : '#1e1e30',
                border: 'none',
                borderRadius: 10,
                color: 'white',
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              Отправить
            </button>
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>

      <Toast
        message={toast.message}
        visible={toast.visible}
        position={toast.position}
      />
      <ContextMenu
        visible={contextMenu.visible}
        position={contextMenu.position}
        onCopy={() => {}}
      />
    </>
  );
}

function MessageBubble({
  message,
  onContextMenu,
  roleIcon,
  roleColor,
}: {
  message: ChatMessage;
  onContextMenu: (e: React.MouseEvent, text: string) => void;
  roleIcon: string;
  roleColor: string;
}) {
  const isHuman = message.role === 'human';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isHuman ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '75%',
          padding: '12px 16px',
          background: isHuman ? '#7c6ff7' : '#121220',
          borderRadius: isHuman ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          color: isHuman ? 'white' : '#e8e8e8',
          userSelect: 'text',
          WebkitUserSelect: 'text',
          cursor: 'text',
        }}
        onContextMenu={e => onContextMenu(e, message.content)}
      >
        {/* Role header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '6px',
          fontSize: '11px',
          color: isHuman ? 'rgba(255,255,255,0.7)' : roleColor,
          fontWeight: 600,
        }}>
          <span>{roleIcon}</span>
          <span>{message.role.toUpperCase()}</span>
          {/* Индикатор "думаю..." */}
          {!isHuman && message.content === '' && (
            <span style={{ marginLeft: '8px', color: '#8888aa', fontWeight: 400 }}>
              <span style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#7c6ff7',
                animation: 'pulse 1.5s infinite',
              }}></span>
              {' '}думаю...
            </span>
          )}
        </div>

        {/* Content */}
        <p style={{
          fontSize: 14,
          lineHeight: 1.5,
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {message.content || ''}
        </p>
        <p style={{
          fontSize: 11,
          color: isHuman ? 'rgba(255,255,255,0.6)' : '#8888aa',
          margin: '6px 0 0 0',
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}>
          {message.timestamp}
        </p>
      </div>
    </div>
  );
}
