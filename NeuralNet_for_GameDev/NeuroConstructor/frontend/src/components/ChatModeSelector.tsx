/**
 * ChatModeSelector — 4 радио-кнопки для выбора режима чата
 */

import React from 'react';
import { ChatMode } from '@/types';

// ============================================================================
// Типы
// ============================================================================

interface ChatModeSelectorProps {
  selectedMode: ChatMode;
  onChange: (mode: ChatMode) => void;
  isTeacherLoaded: boolean;
  isStudentAvailable: boolean;
}

// ============================================================================
// Данные режимов
// ============================================================================

const MODES: {
  id: ChatMode;
  icon: string;
  title: string;
  description: string;
  disabled?: boolean;
}[] = [
  {
    id: 'human-teacher',
    icon: '👨‍🎓',
    title: 'Человек + Учитель',
    description: 'Задаёте вопрос — отвечает Teacher модель',
  },
  {
    id: 'human-student',
    icon: '🎓',
    title: 'Человек + Студент',
    description: 'Задаёте вопрос — отвечает Student модель',
  },
  {
    id: 'human-teacher-student',
    icon: '🤝',
    title: 'Человек + Учитель + Студент',
    description: 'Сравниваете ответы двух моделей на ваш вопрос',
    disabled: false,
  },
  {
    id: 'teacher-student',
    icon: '⚔️',
    title: 'Учитель ↔ Студент',
    description: 'Модели общаются между собой. История сохраняется',
  },
];

// ============================================================================
// Стили
// ============================================================================

const containerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  padding: '8px 16px',
  background: '#0a0a0f',
  borderBottom: '1px solid #1e1e30',
};

const buttonStyle = (selected: boolean, disabled: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 10px',
  background: selected ? 'rgba(124, 111, 247, 0.2)' : 'transparent',
  border: selected ? '1px solid #7c6ff7' : '1px solid transparent',
  borderRadius: '6px',
  color: disabled ? '#555577' : selected ? '#e8e8e8' : '#8888aa',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '11px',
  fontWeight: selected ? 600 : 400,
  transition: 'all 0.15s ease',
  opacity: disabled ? 0.5 : 1,
  flex: 1,
  justifyContent: 'center',
  whiteSpace: 'nowrap',
});

const iconStyle: React.CSSProperties = {
  fontSize: '14px',
};

// ============================================================================
// Компонент
// ============================================================================

export const ChatModeSelector: React.FC<ChatModeSelectorProps> = ({
  selectedMode,
  onChange,
}) => {
  const handleSelect = (mode: ChatMode) => {
    if (MODES.find((m) => m.id === mode)?.disabled) return;
    onChange(mode);
  };

  return (
    <div style={containerStyle}>
      {MODES.map(({ id, icon, title, description, disabled }) => (
        <button
          key={id}
          onClick={() => handleSelect(id)}
          disabled={disabled}
          style={buttonStyle(selectedMode === id, disabled || false)}
          title={description}
        >
          <span style={iconStyle}>{icon}</span>
          <span>{title}</span>
        </button>
      ))}
    </div>
  );
};
