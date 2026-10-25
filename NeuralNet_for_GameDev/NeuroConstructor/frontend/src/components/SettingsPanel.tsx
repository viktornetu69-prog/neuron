import React, { useState } from 'react';

interface SettingsPanelProps {
  isTeacherLoaded: boolean;
  isStudentAvailable: boolean;
  isServerAvailable: boolean;
}

interface AppSettings {
  reasoningTime: number; // время на размышление в секундах
  temperature: number;  // температура генерации
  maxTokens: number;    // макс. токенов в ответе
  autoFallback: boolean; // автопереход на учителя если студент не загружен
  modelFamily: string;  // выбранная семья моделей
  quantization: string; // тип квантификации
  // GPU/SPU настройки
  teacherBackend: 'GPU' | 'CPU';     // 'GPU' = GPU, 'CPU' = CPU
  studentBackend: 'GPU' | 'CPU';     // 'GPU' = GPU, 'CPU' = CPU
  teacherGpuLayers: number;          // количество слоёв на GPU для учителя
  studentGpuLayers: number;          // количество слоёв на GPU для студента
}

const DEFAULT_SETTINGS: AppSettings = {
  reasoningTime: 5,
  temperature: 0.7,
  maxTokens: 1024,
  autoFallback: true,
  modelFamily: 'qwen3',
  quantization: 'Q4_0',
  teacherBackend: 'GPU',
  studentBackend: 'CPU',
  teacherGpuLayers: 35,
  studentGpuLayers: 0,
};

export function SettingsPanel({
  isTeacherLoaded,
  isStudentAvailable,
  isServerAvailable,
}: SettingsPanelProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Сохраняем настройки в localStorage
    localStorage.setItem('neuroconstructor_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Загрузка настроек из localStorage при монтировании
  React.useEffect(() => {
    const saved = localStorage.getItem('neuroconstructor_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch {
        // Ignoring parse errors, using defaults
      }
    }
  }, []);

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: 24,
      background: '#0a0a0f',
    }}>
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
      }}>
        {/* Заголовок */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
        }}>
          <div>
            <h2 style={{
              fontSize: 20,
              fontWeight: 600,
              margin: 0,
              color: '#e8e8e8',
            }}>
              ⚙️ Настройки
            </h2>
            <p style={{
              fontSize: 13,
              color: '#8888aa',
              margin: '8px 0 0',
            }}>
              Конфигурация моделей и поведения чата
            </p>
          </div>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 24px',
              background: saved ? '#4caf50' : '#7c6ff7',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {saved ? '✓ Сохранено' : '💾 Сохранить'}
          </button>
        </div>

        {/* Состояние сервера */}
        <Section title="🖥 Сервер" icon="server">
          <SettingRow
            label="Статус сервера"
            value={isServerAvailable ? 'Онлайн' : 'Недоступен'}
            badge={isServerAvailable ? 'success' : 'error'}
          />
          <SettingRow
            label="Backend API"
            value="http://127.0.0.1:8000"
            copyable
          />
        </Section>

        {/* Teacher модель */}
        <Section title="📦 Teacher модель (большая)" icon="teacher">
          <SettingRow
            label="Статус"
            value={isTeacherLoaded ? 'Загружена' : 'Не загружена'}
            badge={isTeacherLoaded ? 'success' : 'warning'}
          />
          <SettingRow
            label="Семья моделей"
            value={settings.modelFamily.toUpperCase()}
            editable
          />
          <SettingRow
            label="Квантификация"
            value={settings.quantization}
            editable
          />
          <SettingRow
            label="Температура"
            value={settings.temperature.toFixed(2)}
            description="Влияет на креативность ответов (0.0-1.0)"
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.temperature}
              onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              style={{ width: 120 }}
            />
          </SettingRow>
          <SettingRow
            label="Макс. токенов"
            value={settings.maxTokens.toString()}
            description="Максимальная длина ответа"
          >
            <input
              type="number"
              value={settings.maxTokens}
              onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 1024 }))}
              style={{
                width: 80,
                background: '#121220',
                border: '1px solid #1e1e30',
                borderRadius: 4,
                color: '#e8e8e8',
                padding: '4px 8px',
                fontSize: 13,
              }}
            />
          </SettingRow>

          {/* GPU/SPU для Teacher */}
          <div style={{
            marginTop: 16,
            padding: 16,
            background: '#0a0a0f',
            borderRadius: 8,
            border: '1px solid #1e1e30',
          }}>
            <h4 style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#e8e8e8',
              margin: '0 0 12px',
            }}>
              ⚡ Размещение Teacher
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#8888aa', display: 'block', marginBottom: 6 }}>
                  Бэкенд:
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['CPU', 'GPU'] as const).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setSettings(prev => ({ ...prev, teacherBackend: opt }))}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: settings.teacherBackend === opt ? '#7c6ff7' : '#1e1e30',
                        border: '1px solid ' + (settings.teacherBackend === opt ? '#7c6ff7' : '#2a2a3e'),
                        borderRadius: 6,
                        color: 'white',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {opt === 'GPU' ? '🎮 GPU' : '🖥 SPU'}
                    </button>
                  ))}
                </div>
              </div>

              {settings.teacherBackend === 'GPU' && (
                <div>
                  <label style={{ fontSize: 12, color: '#8888aa', display: 'block', marginBottom: 6 }}>
                    слоёв на GPU (0 = всё на CPU):
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.teacherGpuLayers}
                    onChange={(e) => setSettings(prev => ({ ...prev, teacherGpuLayers: parseInt(e.target.value) }))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: 12, color: '#e8e8e8', textAlign: 'center', marginTop: 4 }}>
                    {settings.teacherGpuLayers} слоёв
                  </div>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* Student модель */}
        <Section title="🎓 Student модель (сжатая)" icon="student">
          <SettingRow
            label="Статус"
            value={isStudentAvailable ? 'Доступна' : 'Не доступна'}
            badge={isStudentAvailable ? 'success' : 'error'}
          />
          <SettingRow
            label="Авто-резервирование"
            value={settings.autoFallback ? 'Включено' : 'Выключено'}
            description="Если студент не загружен, отвечает Teacher (но помечается как студент)"
            badge={settings.autoFallback ? 'info' : 'warning'}
          >
            <Toggle
              value={settings.autoFallback}
              onChange={(val) => setSettings(prev => ({ ...prev, autoFallback: val }))}
            />
          </SettingRow>

          {/* GPU/SPU для Student */}
          <div style={{
            marginTop: 16,
            padding: 16,
            background: '#0a0a0f',
            borderRadius: 8,
            border: '1px solid #1e1e30',
          }}>
            <h4 style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#e8e8e8',
              margin: '0 0 12px',
            }}>
              ⚡ Размещение Student
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#8888aa', display: 'block', marginBottom: 6 }}>
                  Бэкенд:
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['CPU', 'GPU'] as const).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setSettings(prev => ({ ...prev, studentBackend: opt }))}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: settings.studentBackend === opt ? '#7c6ff7' : '#1e1e30',
                        border: '1px solid ' + (settings.studentBackend === opt ? '#7c6ff7' : '#2a2a3e'),
                        borderRadius: 6,
                        color: 'white',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {opt === 'GPU' ? '🎮 GPU' : '🖥 SPU'}
                    </button>
                  ))}
                </div>
              </div>

              {settings.studentBackend === 'GPU' && (
                <div>
                  <label style={{ fontSize: 12, color: '#8888aa', display: 'block', marginBottom: 6 }}>
                    слоёв на GPU (0 = всё на CPU):
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.studentGpuLayers}
                    onChange={(e) => setSettings(prev => ({ ...prev, studentGpuLayers: parseInt(e.target.value) }))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: 12, color: '#e8e8e8', textAlign: 'center', marginTop: 4 }}>
                    {settings.studentGpuLayers} слоёв
                  </div>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* Поведение чата */}
        <Section title="💬 Поведение чата" icon="chat">
          <SettingRow
            label="Время на размышление"
            value={settings.reasoningTime >= 60
              ? `${Math.floor(settings.reasoningTime / 60)} мин ${settings.reasoningTime % 60} сек`
              : `${settings.reasoningTime} сек`}
            description="Время ожидания ответа от модели перед таймаутом"
          >
            <input
              type="range"
              min="30"
              max="300"
              step="5"
              value={settings.reasoningTime}
              onChange={(e) => setSettings(prev => ({ ...prev, reasoningTime: parseInt(e.target.value) }))}
              style={{ width: 120 }}
            />
          </SettingRow>

          <div style={{
            padding: 16,
            background: '#121220',
            borderRadius: 8,
            border: '1px solid #1e1e30',
            marginTop: 16,
          }}>
            <h4 style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#e8e8e8',
              margin: '0 0 12px',
            }}>
              🔄 Кто отвечает за кого
            </h4>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <LogicRow
                user="Пишу учителю"
                responder="Отвечает Teacher модель"
                icon="📦"
                color="#7c6ff7"
              />
              <LogicRow
                user="Пишу студенту"
                responder={settings.autoFallback
                  ? 'Если студент не загружен → отвечает Teacher (помечается как студент)'
                  : 'Отвечает Student модель'}
                icon="🎓"
                color="#4caf50"
              />
              <LogicRow
                user="Режим сравнения"
                responder="Отвечают обе модели одновременно"
                icon="⚖️"
                color="#ff9800"
              />
              <LogicRow
                user="Teacher ↔ Student"
                responder="Модели обсуждают между собой"
                icon="🔄"
                color="#00bcd4"
              />
            </div>
          </div>
        </Section>

        {/* О системе */}
        <Section title="ℹ️ О системе" icon="info">
          <SettingRow label="Версия" value="NeuroConstructor v0.9.2" />
          <SettingRow label="Пайплайн" value="Teacher → Dataset → Student (Q4_0)" />
          <SettingRow label="Backend" value="FastAPI + LlamaCpp" />

          {/* Кнопка одновременной загрузки */}
          <div style={{
            marginTop: 16,
            padding: 16,
            background: '#0a0a0f',
            borderRadius: 8,
            border: '1px solid #1e1e30',
          }}>
            <h4 style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#e8e8e8',
              margin: '0 0 12px',
            }}>
              🚀 Быстрая загрузка
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                padding: 12,
                background: '#121220',
                borderRadius: 6,
                border: '1px solid #1e1e30',
              }}>
                <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>
                  Текущая конфигурация:
                </div>
                <div style={{ fontSize: 12, color: '#e8e8e8' }}>
                  📦 Teacher: <strong>{settings.teacherBackend === 'GPU' ? '🎮 GPU' : '🖥 SPU'}</strong>
                  {settings.teacherBackend === 'GPU' && ` (${settings.teacherGpuLayers} слоёв)`}
                  {' | '}(
                  🎓 Student: <strong>{settings.studentBackend === 'GPU' ? '🎮 GPU' : '🖥 SPU'}</strong>
                  {settings.studentBackend === 'GPU' && ` (${settings.studentGpuLayers} слоёв)`}
                </div>
              </div>

              <button
                onClick={() => {
                  const config = JSON.stringify({
                    teacher: {
                      backend: settings.teacherBackend.toLowerCase(),
                      gpu_layers: settings.teacherGpuLayers,
                    },
                    student: {
                      backend: settings.studentBackend.toLowerCase(),
                      gpu_layers: settings.studentGpuLayers,
                    },
                  }, null, 2);
                  navigator.clipboard.writeText(config);
                  alert('Конфигурация скопирована!\n\n' + config + '\n\nИспользуйте с: curl -X POST http://127.0.0.1:8000/api/models/load-all');
                }}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #7c6ff7 0%, #9d8fff 100%)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                📋 Копировать конфиг и загрузить через API
              </button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

// ============================================================================
// Подкомпоненты
// ============================================================================

interface SectionProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div style={{
      marginBottom: 24,
      padding: 20,
      background: '#0f0f1a',
      borderRadius: 12,
      border: '1px solid #1e1e30',
    }}>
      <h3 style={{
        fontSize: 15,
        fontWeight: 600,
        color: '#e8e8e8',
        margin: '0 0 16px',
        paddingBottom: 8,
        borderBottom: '1px solid #1e1e30',
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

interface SettingRowProps {
  label: string;
  value: string;
  description?: string;
  badge?: 'success' | 'error' | 'warning' | 'info';
  editable?: boolean;
  copyable?: boolean;
  children?: React.ReactNode;
}

function SettingRow({
  label,
  value,
  description,
  badge,
  children,
}: SettingRowProps) {
  const badgeColors = {
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#00bcd4',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#e8e8e8',
          }}>
            {label}
          </span>
          {badge && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              background: `${badgeColors[badge]}20`,
              color: badgeColors[badge],
            }}>
              {value}
            </span>
          )}
          {!badge && (
            <span style={{
              fontSize: 13,
              color: '#8888aa',
            }}>
              {value}
            </span>
          )}
        </div>
        {description && (
          <div style={{
            fontSize: 11,
            color: '#666680',
            marginTop: 2,
          }}>
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

function Toggle({ value, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        background: value ? '#7c6ff7' : '#1e1e30',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2,
        left: value ? 24 : 2,
        width: 20,
        height: 20,
        borderRadius: 10,
        background: 'white',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

interface LogicRowProps {
  user: string;
  responder: string;
  icon: string;
  color: string;
}

function LogicRow({ user, responder, icon, color }: LogicRowProps) {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      padding: 12,
      background: '#0a0a0f',
      borderRadius: 8,
      border: '1px solid #1e1e30',
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: `${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color,
          marginBottom: 4,
        }}>
          {user}
        </div>
        <div style={{
          fontSize: 12,
          color: '#8888aa',
        }}>
          → {responder}
        </div>
      </div>
    </div>
  );
}
