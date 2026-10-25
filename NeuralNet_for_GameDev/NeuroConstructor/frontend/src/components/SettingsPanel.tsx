import React, { useState, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

type TabId = 'server' | 'teacher' | 'student' | 'chat' | 'benchmark' | 'engine';

interface TabItem {
  id: TabId;
  icon: string;
  label: string;
}

// ============================================================================
// Settings Interface (Single Source of Truth)
// ============================================================================

export interface AppSettings {
  // Server
  apiUrl: string;
  apiPort: number;
  requestTimeout: number; // ms
  serverUrl: string; // computed: apiUrl + ':' + apiPort

  // Teacher
  teacherBackend: 'GPU' | 'CPU';
  teacherGpuLayers: number;
  teacherTemperature: number;
  teacherMaxTokens: number;

  // Student
  studentBackend: 'GPU' | 'CPU';
  studentGpuLayers: number;
  studentModelFamily: string;
  studentHiddenSize: number;
  studentNumLayers: number;
  studentNumHeads: number;
  studentVocabSize: number;
  studentQuantization: string;

  // Chat
  chatRoleColors: {
    human: string;
    teacher: string;
    student: string;
  };
  chatRoleIcons: {
    human: string;
    teacher: string;
    student: string;
  };
  chatPlaceholders: {
    'human-teacher': string;
    'human-student': string;
    'human-teacher-student': string;
    'teacher-student': string;
  };

  // Benchmark
  benchmarkQaPairs: number;
  benchmarkChatDialogs: number;
  benchmarkCodeExamples: number;
  benchmarkCreativeTasks: number;
  benchmarkOutputDir: string;
  benchmarkQualityThreshold: number; // 0.0-1.0
  benchmarkFineTuningTrigger: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  // Server
  apiUrl: 'http://127.0.0.1',
  apiPort: 8000,
  requestTimeout: 300000,
  serverUrl: 'http://127.0.0.1:8000',

  // Teacher
  teacherBackend: 'GPU',
  teacherGpuLayers: 35,
  teacherTemperature: 0.7,
  teacherMaxTokens: 1024,

  // Student
  studentBackend: 'CPU',
  studentGpuLayers: 0,
  studentModelFamily: 'qwen3',
  studentHiddenSize: 768,
  studentNumLayers: 12,
  studentNumHeads: 12,
  studentVocabSize: 32000,
  studentQuantization: 'Q4_0',

  // Chat
  chatRoleColors: {
    human: '#8888aa',
    teacher: '#4caf50',
    student: '#7c6ff7',
  },
  chatRoleIcons: {
    human: '👤',
    teacher: '👨‍🏫',
    student: '🎓',
  },
  chatPlaceholders: {
    'human-teacher': 'Спросите учителя...',
    'human-student': 'Спросите студента...',
    'human-teacher-student': 'Задайте вопрос для сравнения ответов...',
    'teacher-student': 'Введите тему для обсуждения учителя и студента...',
  },

  // Benchmark
  benchmarkQaPairs: 5,
  benchmarkChatDialogs: 3,
  benchmarkCodeExamples: 2,
  benchmarkCreativeTasks: 2,
  benchmarkOutputDir: 'benchmarks',
  benchmarkQualityThreshold: 0.85,
  benchmarkFineTuningTrigger: true,
};

const STORAGE_KEY = 'neuroconstructor_settings_v2';

const TABS: TabItem[] = [
  { id: 'server', icon: '🖥', label: 'Сервер' },
  { id: 'teacher', icon: '📦', label: 'Teacher' },
  { id: 'student', icon: '🎓', label: 'Student' },
  { id: 'chat', icon: '💬', label: 'Чат' },
  { id: 'benchmark', icon: '📊', label: 'Benchmark' },
  { id: 'engine', icon: '🔧', label: 'Engine' },
];

// ============================================================================
// Helper Components
// ============================================================================

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      marginBottom: 20,
      padding: 16,
      background: '#0f0f1a',
      borderRadius: 10,
      border: '1px solid #1e1e30',
    }}>
      <h3 style={{
        fontSize: 14,
        fontWeight: 600,
        color: '#e8e8e8',
        margin: '0 0 14px',
        paddingBottom: 8,
        borderBottom: '1px solid #1e1e30',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span>{icon}</span> {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
  badge,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  badge?: 'success' | 'error' | 'warning' | 'info';
}) {
  const badgeColors = {
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#00bcd4',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#e8e8e8' }}>{label}</span>
          {badge && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              background: `${badgeColors[badge]}20`,
              color: badgeColors[badge],
            }}>
              {typeof children === 'string' ? children : badge}
            </span>
          )}
        </div>
        {description && (
          <div style={{ fontSize: 11, color: '#666680', marginTop: 2 }}>{description}</div>
        )}
      </div>
      {!badge && children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
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

function BackendSelector({ value, onChange }: { value: 'GPU' | 'CPU'; onChange: (v: 'GPU' | 'CPU') => void }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {(['CPU', 'GPU'] as const).map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: value === opt ? '#7c6ff7' : '#1e1e30',
            border: '1px solid ' + (value === opt ? '#7c6ff7' : '#2a2a3e'),
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
  );
}

// ============================================================================
// Tab Content Components
// ============================================================================

function ServerTab({ settings, setSettings }: { settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePortChange = (val: number) => {
    setSettings(prev => ({
      ...prev,
      apiPort: val,
      serverUrl: `${prev.apiUrl}:${val}`,
    }));
  };

  return (
    <div>
      <Section title="Подключение" icon="🌐">
        <SettingRow label="API URL" description="Адрес бэкенд сервера">
          <input
            type="text"
            value={settings.apiUrl}
            onChange={(e) => setSettings(prev => ({ ...prev, apiUrl: e.target.value, serverUrl: `${e.target.value}:${prev.apiPort}` }))}
            style={{
              width: 200,
              padding: '8px 12px',
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 6,
              color: '#e8e8e8',
              fontSize: 13,
            }}
          />
        </SettingRow>
        <SettingRow label="Порт">
          <input
            type="number"
            value={settings.apiPort}
            onChange={(e) => handlePortChange(parseInt(e.target.value) || 8000)}
            style={{
              width: 80,
              padding: '8px 12px',
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 6,
              color: '#e8e8e8',
              fontSize: 13,
            }}
          />
        </SettingRow>
        <SettingRow label="Итоговый URL" badge="info">
          <span style={{ fontSize: 13, color: '#00bcd4' }}>{settings.serverUrl}</span>
        </SettingRow>
        <SettingRow label="Timeout запроса">
          <input
            type="number"
            value={settings.requestTimeout / 1000}
            onChange={(e) => setSettings(prev => ({ ...prev, requestTimeout: (parseInt(e.target.value) || 5) * 1000 }))}
            style={{
              width: 80,
              padding: '8px 12px',
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 6,
              color: '#e8e8e8',
              fontSize: 13,
            }}
          />
          <span style={{ fontSize: 11, color: '#8888aa' }}>сек</span>
        </SettingRow>
      </Section>
      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '12px 24px',
          background: saved ? '#4caf50' : '#7c6ff7',
          border: 'none',
          borderRadius: 8,
          color: 'white',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 8,
        }}
      >
        {saved ? '✓ Сохранено' : '💾 Сохранить'}
      </button>
    </div>
  );
}

function TeacherTab({ settings, setSettings }: { settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <Section title="Размещение" icon="⚡">
        <SettingRow label="Бэкенд">
          <BackendSelector
            value={settings.teacherBackend}
            onChange={(val) => setSettings(prev => ({ ...prev, teacherBackend: val }))}
          />
        </SettingRow>
        {settings.teacherBackend === 'GPU' && (
          <SettingRow label="Слоёв на GPU" description="0 = всё на CPU, 100 = всё на GPU">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 200 }}>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.teacherGpuLayers}
                onChange={(e) => setSettings(prev => ({ ...prev, teacherGpuLayers: parseInt(e.target.value) }))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 13, color: '#e8e8e8', minWidth: 30 }}>{settings.teacherGpuLayers}</span>
            </div>
          </SettingRow>
        )}
      </Section>
      <Section title="Генерация" icon="🧠">
        <SettingRow label="Температура" description="0.0 = точный, 1.0 = креативный">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 200 }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.teacherTemperature}
              onChange={(e) => setSettings(prev => ({ ...prev, teacherTemperature: parseFloat(e.target.value) }))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 13, color: '#e8e8e8', minWidth: 30 }}>{settings.teacherTemperature.toFixed(2)}</span>
          </div>
        </SettingRow>
        <SettingRow label="Макс. токенов" description="Длина ответа">
          <input
            type="number"
            value={settings.teacherMaxTokens}
            onChange={(e) => setSettings(prev => ({ ...prev, teacherMaxTokens: parseInt(e.target.value) || 1024 }))}
            style={{
              width: 100,
              padding: '8px 12px',
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 6,
              color: '#e8e8e8',
              fontSize: 13,
            }}
          />
        </SettingRow>
      </Section>
      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '12px 24px',
          background: saved ? '#4caf50' : '#7c6ff7',
          border: 'none',
          borderRadius: 8,
          color: 'white',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 8,
        }}
      >
        {saved ? '✓ Сохранено' : '💾 Сохранить'}
      </button>
    </div>
  );
}

function StudentTab({ settings, setSettings }: { settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <Section title="Размещение" icon="⚡">
        <SettingRow label="Бэкенд">
          <BackendSelector
            value={settings.studentBackend}
            onChange={(val) => setSettings(prev => ({ ...prev, studentBackend: val }))}
          />
        </SettingRow>
        {settings.studentBackend === 'GPU' && (
          <SettingRow label="Слоёв на GPU">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 200 }}>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.studentGpuLayers}
                onChange={(e) => setSettings(prev => ({ ...prev, studentGpuLayers: parseInt(e.target.value) }))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 13, color: '#e8e8e8', minWidth: 30 }}>{settings.studentGpuLayers}</span>
            </div>
          </SettingRow>
        )}
      </Section>
      <Section title="Архитектура" icon="🏗">
        <SettingRow label="Семья моделей">
          <select
            value={settings.studentModelFamily}
            onChange={(e) => setSettings(prev => ({ ...prev, studentModelFamily: e.target.value }))}
            style={{
              padding: '8px 12px',
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 6,
              color: '#e8e8e8',
              fontSize: 13,
            }}
          >
            <option value="qwen3">Qwen3</option>
            <option value="llama">Llama</option>
            <option value="mistral">Mistral</option>
          </select>
        </SettingRow>
        <SettingRow label="Hidden Size">
          <input
            type="number"
            value={settings.studentHiddenSize}
            onChange={(e) => setSettings(prev => ({ ...prev, studentHiddenSize: parseInt(e.target.value) || 768 }))}
            style={{
              width: 100,
              padding: '8px 12px',
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 6,
              color: '#e8e8e8',
              fontSize: 13,
            }}
          />
        </SettingRow>
        <SettingRow label="Слои">
          <input
            type="number"
            value={settings.studentNumLayers}
            onChange={(e) => setSettings(prev => ({ ...prev, studentNumLayers: parseInt(e.target.value) || 12 }))}
            style={{
              width: 100,
              padding: '8px 12px',
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 6,
              color: '#e8e8e8',
              fontSize: 13,
            }}
          />
        </SettingRow>
        <SettingRow label="Головки">
          <input
            type="number"
            value={settings.studentNumHeads}
            onChange={(e) => setSettings(prev => ({ ...prev, studentNumHeads: parseInt(e.target.value) || 12 }))}
            style={{
              width: 100,
              padding: '8px 12px',
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 6,
              color: '#e8e8e8',
              fontSize: 13,
            }}
          />
        </SettingRow>
        <SettingRow label="Словарь">
          <input
            type="number"
            value={settings.studentVocabSize}
            onChange={(e) => setSettings(prev => ({ ...prev, studentVocabSize: parseInt(e.target.value) || 32000 }))}
            style={{
              width: 100,
              padding: '8px 12px',
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 6,
              color: '#e8e8e8',
              fontSize: 13,
            }}
          />
        </SettingRow>
        <SettingRow label="Квантификация">
          <select
            value={settings.studentQuantization}
            onChange={(e) => setSettings(prev => ({ ...prev, studentQuantization: e.target.value }))}
            style={{
              padding: '8px 12px',
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 6,
              color: '#e8e8e8',
              fontSize: 13,
            }}
          >
            <option value="Q4_0">Q4_0</option>
            <option value="Q5_0">Q5_0</option>
            <option value="Q6_0">Q6_0</option>
            <option value="Q8_0">Q8_0</option>
          </select>
        </SettingRow>
      </Section>
      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '12px 24px',
          background: saved ? '#4caf50' : '#7c6ff7',
          border: 'none',
          borderRadius: 8,
          color: 'white',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 8,
        }}
      >
        {saved ? '✓ Сохранено' : '💾 Сохранить'}
      </button>
    </div>
  );
}

function ChatTab({ settings, setSettings }: { settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleColorChange = (role: 'human' | 'teacher' | 'student', color: string) => {
    setSettings(prev => ({
      ...prev,
      chatRoleColors: { ...prev.chatRoleColors, [role]: color },
    }));
  };

  const handleIconChange = (role: 'human' | 'teacher' | 'student', icon: string) => {
    setSettings(prev => ({
      ...prev,
      chatRoleIcons: { ...prev.chatRoleIcons, [role]: icon || '●' },
    }));
  };

  return (
    <div>
      <Section title="Роли" icon="👥">
        {(['human', 'teacher', 'student'] as const).map(role => (
          <div key={role} style={{
            padding: 12,
            background: '#0a0a0f',
            borderRadius: 8,
            border: '1px solid #1e1e30',
            marginBottom: 8,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8e8', marginBottom: 8 }}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#8888aa', display: 'block', marginBottom: 4 }}>Иконка</label>
                <input
                  type="text"
                  value={settings.chatRoleIcons[role]}
                  onChange={(e) => handleIconChange(role, e.target.value)}
                  style={{
                    width: 60,
                    padding: '6px 8px',
                    background: '#121220',
                    border: '1px solid #1e1e30',
                    borderRadius: 6,
                    color: '#e8e8e8',
                    fontSize: 14,
                    textAlign: 'center',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#8888aa', display: 'block', marginBottom: 4 }}>Цвет</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={settings.chatRoleColors[role]}
                    onChange={(e) => handleColorChange(role, e.target.value)}
                    style={{
                      width: 36,
                      height: 30,
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: 'none',
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#8888aa' }}>{settings.chatRoleColors[role]}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </Section>
      <Section title="Подсказки ввода" icon="💡">
        {(Object.keys(settings.chatPlaceholders) as Array<keyof typeof settings.chatPlaceholders>).map(mode => {
          const labels: Record<string, string> = {
            'human-teacher': 'Человек + Учитель',
            'human-student': 'Человек + Студент',
            'human-teacher-student': 'Все трое',
            'teacher-student': 'Учитель ↔ Студент',
          };
          return (
            <SettingRow key={mode} label={labels[mode]}>
              <input
                type="text"
                value={settings.chatPlaceholders[mode]}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  chatPlaceholders: { ...prev.chatPlaceholders, [mode]: e.target.value },
                }))}
                style={{
                  width: 250,
                  padding: '6px 10px',
                  background: '#121220',
                  border: '1px solid #1e1e30',
                  borderRadius: 6,
                  color: '#e8e8e8',
                  fontSize: 12,
                }}
              />
            </SettingRow>
          );
        })}
      </Section>
      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '12px 24px',
          background: saved ? '#4caf50' : '#7c6ff7',
          border: 'none',
          borderRadius: 8,
          color: 'white',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 8,
        }}
      >
        {saved ? '✓ Сохранено' : '💾 Сохранить'}
      </button>
    </div>
  );
}

function BenchmarkTab({ settings, setSettings }: { settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <Section title="Количество тестов" icon="📝">
        <SettingRow label="QA пары">
          <input
            type="number"
            value={settings.benchmarkQaPairs}
            onChange={(e) => setSettings(prev => ({ ...prev, benchmarkQaPairs: Math.max(1, parseInt(e.target.value) || 5) }))}
            style={{
              width: 100,
              padding: '8px 12px',
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 6,
              color: '#e8e8e8',
              fontSize: 13,
            }}
          />
        </SettingRow>
        <SettingRow label="Чат диалоги">
          <input
            type="number"
            value={settings.benchmarkChatDialogs}
            onChange={(e) => setSettings(prev => ({ ...prev, benchmarkChatDialogs: Math.max(1, parseInt(e.target.value) || 3) }))}
            style={{
              width: 100,
              padding: '8px 12px',
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 6,
              color: '#e8e8e8',
              fontSize: 13,
            }}
          />
        </SettingRow>
        <SettingRow label="Код примеры">
          <input
            type="number"
            value={settings.benchmarkCodeExamples}
            onChange={(e) => setSettings(prev => ({ ...prev, benchmarkCodeExamples: Math.max(1, parseInt(e.target.value) || 2) }))}
            style={{
              width: 100,
              padding: '8px 12px',
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 6,
              color: '#e8e8e8',
              fontSize: 13,
            }}
          />
        </SettingRow>
        <SettingRow label="Креатив задания">
          <input
            type="number"
            value={settings.benchmarkCreativeTasks}
            onChange={(e) => setSettings(prev => ({ ...prev, benchmarkCreativeTasks: Math.max(1, parseInt(e.target.value) || 2) }))}
            style={{
              width: 100,
              padding: '8px 12px',
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 6,
              color: '#e8e8e8',
              fontSize: 13,
            }}
          />
        </SettingRow>
      </Section>
      <Section title="Параметры" icon="⚙️">
        <SettingRow label="Output dir">
          <input
            type="text"
            value={settings.benchmarkOutputDir}
            onChange={(e) => setSettings(prev => ({ ...prev, benchmarkOutputDir: e.target.value }))}
            style={{
              width: 200,
              padding: '8px 12px',
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 6,
              color: '#e8e8e8',
              fontSize: 13,
            }}
          />
        </SettingRow>
        <SettingRow label="Порог качества" description="Минимальный pass_rate для принятия Student">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 200 }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.benchmarkQualityThreshold}
              onChange={(e) => setSettings(prev => ({ ...prev, benchmarkQualityThreshold: parseFloat(e.target.value) }))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 13, color: '#e8e8e8', minWidth: 40 }}>
              {(settings.benchmarkQualityThreshold * 100).toFixed(0)}%
            </span>
          </div>
        </SettingRow>
        <SettingRow label="Авто Fine-tuning" description="Запуск дообучения при падении качества">
          <Toggle
            value={settings.benchmarkFineTuningTrigger}
            onChange={(val) => setSettings(prev => ({ ...prev, benchmarkFineTuningTrigger: val }))}
          />
        </SettingRow>
      </Section>
      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '12px 24px',
          background: saved ? '#4caf50' : '#7c6ff7',
          border: 'none',
          borderRadius: 8,
          color: 'white',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 8,
        }}
      >
        {saved ? '✓ Сохранено' : '💾 Сохранить'}
      </button>
    </div>
  );
}

function EngineTab({ settings, setSettings }: { settings: AppSettings; setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }) {
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>('');
  const [showSystemSettings, setShowSystemSettings] = useState(false);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const apiUrl = settings.serverUrl || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/api/llm/status`);
      const data = await res.json();
      setEngineStatus(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch LLM status:', err);
      setEngineStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [settings.serverUrl]);

  const handleReset = () => {
    if (confirm('Сбросить все настройки к значениям по умолчанию?')) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(settings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neuroconstructor_settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
          window.location.reload();
        } catch {
          alert('Ошибка импорта: неверный формат файла');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const isServerReachable = engineStatus !== null;

  return (
    <div>
      <Section title="🤖 LLM Engine Status" icon="⚙️">
        <div style={{
          padding: 16,
          background: isServerReachable ? '#0f0f1a' : '#1a1a2e',
          borderRadius: 8,
          border: `1px solid ${isServerReachable ? '#1e1e30' : '#f44336'}`,
        }}>
          {!isServerReachable ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#f44336' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 13 }}>Сервер недоступен</div>
              <button
                onClick={fetchStatus}
                disabled={statusLoading}
                style={{
                  marginTop: 12,
                  padding: '8px 16px',
                  background: '#121220',
                  border: '1px solid #1e1e30',
                  borderRadius: 6,
                  color: '#e8e8e8',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {statusLoading ? '...' : '🔄 Повторить'}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: '#8888aa' }}>Последняя проверка: {lastChecked}</span>
                <button
                  onClick={fetchStatus}
                  disabled={statusLoading}
                  style={{
                    padding: '6px 12px',
                    background: '#121220',
                    border: '1px solid #1e1e30',
                    borderRadius: 6,
                    color: '#8888aa',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  {statusLoading ? '...' : '🔄 Обновить'}
                </button>
              </div>

              {/* Backend Status */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <StatusBadge label="llama-cpp-python" value={engineStatus.llama_cpp_available ? '✅ Available' : '❌ Not installed'} color={engineStatus.llama_cpp_available ? '#4caf50' : '#f44336'} />
                <StatusBadge label="Backend" value={engineStatus.backend_status || 'unknown'} color={engineStatus.backend_status === 'ready' ? '#4caf50' : '#ff9800'} />
              </div>

              {/* Model Loading States */}
              <div style={{
                padding: 12,
                background: '#0a0a0f',
                borderRadius: 8,
                border: '1px solid #1e1e30',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8e8', marginBottom: 12 }}>📦 Состояние моделей</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <ModelStatusRow
                    label="Teacher"
                    icon="📦"
                    loaded={engineStatus.model_type === 'teacher' && engineStatus.model_loaded}
                    path={engineStatus.model_type === 'teacher' && engineStatus.model_loaded ? engineStatus.model_path : undefined}
                  />
                  <ModelStatusRow
                    label="Student"
                    icon="🎓"
                    loaded={engineStatus.model_type === 'student' && engineStatus.model_loaded}
                    path={engineStatus.model_type === 'student' && engineStatus.model_loaded ? engineStatus.model_path : undefined}
                  />
                </div>
              </div>

              {/* Model Info */}
              {engineStatus.model_loaded && (
                <div style={{
                  marginTop: 12,
                  padding: 10,
                  background: 'rgba(124, 111, 247, 0.1)',
                  borderLeft: '3px solid #7c6ff7',
                  borderRadius: '0 6px 6px 0',
                  fontSize: 12,
                  color: '#8888aa',
                }}>
                  <div style={{ color: '#e8e8e8', marginBottom: 4 }}>Текущая модель: {engineStatus.model_path}</div>
                  <div>GPU layers: {engineStatus.gpu_layers || 0} | Size: {engineStatus.model_size_gb || 0} GB</div>
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section title="Системные настройки" icon="💾">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={handleExport} style={systemButtonStyle}>📤 Экспорт настроек</button>
          <button onClick={handleImport} style={systemButtonStyle}>📥 Импорт настроек</button>
          <button onClick={handleReset} style={{ ...systemButtonStyle, background: 'rgba(244, 67, 54, 0.1)', border: '1px solid #f44336', color: '#f44336' }}>🗑 Сбросить настройки</button>
        </div>
      </Section>
    </div>
  );
}

const systemButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: '#121220',
  border: '1px solid #1e1e30',
  borderRadius: 8,
  color: '#e8e8e8',
  fontSize: 13,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

function StatusBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      flex: 1,
      padding: '8px 12px',
      background: '#0a0a0f',
      borderRadius: 6,
      border: '1px solid #1e1e30',
    }}>
      <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

function ModelStatusRow({ label, icon, loaded, path }: { label: string; icon: string; loaded: boolean; path?: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      background: loaded ? 'rgba(76, 175, 80, 0.1)' : '#121220',
      border: `1px solid ${loaded ? '#4caf50' : '#1e1e30'}`,
      borderRadius: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: loaded ? '#4caf50' : '#8888aa' }}>{label}</span>
        {loaded && path && <span style={{ fontSize: 11, color: '#8888aa' }}>→ {path.split('\\').pop()}</span>}
      </div>
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 4,
        background: loaded ? 'rgba(76, 175, 80, 0.2)' : 'rgba(136, 136, 170, 0.2)',
        color: loaded ? '#4caf50' : '#8888aa',
      }}>
        {loaded ? '✅ Загружена' : '○ Не загружена'}
      </span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('server');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        // Using defaults
      }
    }
  }, []);

  const renderTab = (tab: TabId) => {
    switch (tab) {
      case 'server':
        return <ServerTab settings={settings} setSettings={setSettings} />;
      case 'teacher':
        return <TeacherTab settings={settings} setSettings={setSettings} />;
      case 'student':
        return <StudentTab settings={settings} setSettings={setSettings} />;
      case 'chat':
        return <ChatTab settings={settings} setSettings={setSettings} />;
      case 'benchmark':
        return <BenchmarkTab settings={settings} setSettings={setSettings} />;
      case 'engine':
        return <EngineTab settings={settings} setSettings={setSettings} />;
      default:
        return null;
    }
  };

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: 24,
      background: '#0a0a0f',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
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
              Конфигурация всех компонентов приложения
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 24,
          background: '#0f0f1a',
          padding: 4,
          borderRadius: 10,
          border: '1px solid #1e1e30',
          overflowX: 'auto',
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: activeTab === tab.id ? 'rgba(124, 111, 247, 0.2)' : 'transparent',
                border: activeTab === tab.id ? '1px solid #7c6ff7' : '1px solid transparent',
                borderRadius: 8,
                color: activeTab === tab.id ? '#e8e8e8' : '#8888aa',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {renderTab(activeTab)}
      </div>
    </div>
  );
}
