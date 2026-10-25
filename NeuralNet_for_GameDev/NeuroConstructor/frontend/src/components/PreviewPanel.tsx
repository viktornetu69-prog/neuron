import React, { useState, useEffect, useRef } from 'react';
import { NeuralNetVisualizer } from './NeuralNetVisualizer';

interface PreviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  serverRunning: boolean;
  onToggleServer: () => void;
  teacherAnalysis?: {
    architecture?: {
      model_family?: string;
      vocab_size?: number;
      hidden_size?: number;
      num_layers?: number;
      num_heads?: number;
      num_kv_heads?: number;
      head_dim?: number;
      max_position_embeddings?: number;
      rope_theta?: number;
    };
    parameters?: {
      estimated_total_params?: number;
      tensor_count?: number;
      file_size_gb?: number;
    };
  } | null;
}

type PreviewMode = 'server' | 'architecture';

interface ServerConfig {
  command: string;
  cwd: string;
  port: number;
  status: 'idle' | 'starting' | 'running' | 'error';
  output: string[];
  pid?: number;
}

export function PreviewPanel({ isOpen, onClose, serverRunning, onToggleServer, teacherAnalysis }: PreviewPanelProps) {
  const [config, setConfig] = useState<ServerConfig>({
    command: 'cd frontend && npm run dev -- --host 127.0.0.1 --port 5173',
    cwd: '',
    port: 5173,
    status: 'idle',
    output: [],
  });
  const [iframeSrc, setIframeSrc] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('server');
  const outputRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [config.output]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const addLog = (msg: string) => {
    setConfig(prev => ({
      ...prev,
      output: [...prev.output, `[${new Date().toLocaleTimeString()}] ${msg}`],
    }));
  };

  const handleStartServer = async () => {
    addLog(`🚀 Запуск сервера: ${config.command}`);

    setConfig(prev => ({
      ...prev,
      status: 'starting',
      output: [...prev.output, `[${new Date().toLocaleTimeString()}] Инициализация...`],
    }));

    try {
      abortRef.current = new AbortController();

      // Определяем рабочую директорию
      const targetCwd = config.cwd || process.cwd();

      addLog(`📂 CWD: ${targetCwd}`);

      // Запускаем subprocess
      const { spawn } = await import('child_process');
      const [cmd, ...args] = config.command.split(' ');

      addLog(`⚙️  Команда: ${cmd} ${args.join(' ')}`);

      const child = spawn(cmd, args, {
        cwd: targetCwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let outputBuffer = '';

      child.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        outputBuffer += text;
        addLog(text.trim());

        // Проверяем, запущен ли сервер
        if (text.toLowerCase().includes('ready') ||
            text.toLowerCase().includes('localhost') ||
            text.toLowerCase().includes('http://')) {
          addLog('✅ Сервер готов!');
          setConfig(prev => ({
            ...prev,
            status: 'running',
            pid: child.pid,
          }));
          setIframeSrc(`http://127.0.0.1:${config.port}`);
          onToggleServer();
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        addLog(`❌ ${data.toString().trim()}`);
      });

      child.on('error', (err) => {
        addLog(`⚠️  Ошибка запуска: ${err.message}`);
        setConfig(prev => ({
          ...prev,
          status: 'error',
        }));
      });

      child.on('exit', (code) => {
        addLog(`🛑 Процесс завершил работу с кодом ${code}`);
        setConfig(prev => ({
          ...prev,
          status: 'idle',
          pid: undefined,
        }));
        setIframeSrc('');
        onToggleServer();
      });

    } catch (error: any) {
      addLog(`❌ Ошибка: ${error.message}`);
      setConfig(prev => ({
        ...prev,
        status: 'error',
      }));
    }
  };

  const handleStopServer = async () => {
    addLog('🛑 Остановка сервера...');

    if (config.pid) {
      try {
        // Windows: taskkill
        const { execSync } = await import('child_process');
        execSync(`taskkill /PID ${config.pid} /F`, { stdio: 'pipe' });
        addLog(`✅ Процесс ${config.pid} остановлен`);
      } catch (err: any) {
        addLog(`⚠️  Не удалось остановить процесс: ${err.message}`);
      }
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }

    setConfig(prev => ({
      ...prev,
      status: 'idle',
      pid: undefined,
      output: [...prev.output, `[${new Date().toLocaleTimeString()}] Сервер остановлен`],
    }));
    setIframeSrc('');
    onToggleServer();
  };

  const handleClearOutput = () => {
    setConfig(prev => ({
      ...prev,
      output: [],
    }));
  };

  // Detect if frontend exists
  const frontendExists = false; // Will be set dynamically

  if (!isOpen) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0f0f1a',
      borderLeft: '1px solid #1a1a2e',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #1a1a2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#0a0a0f',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 14, color: '#8888aa' }}>&lt;/&gt;</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8' }}>
            Предпросмотр
          </span>
          <div style={{
            display: 'flex',
            background: '#1a1a2e',
            borderRadius: 6,
            overflow: 'hidden',
            border: '1px solid #2a2a3e',
          }}>
            <button
              onClick={() => setPreviewMode('server')}
              style={{
                padding: '4px 10px',
                background: previewMode === 'server' ? 'rgba(124, 111, 247, 0.2)' : 'transparent',
                border: 'none',
                color: previewMode === 'server' ? '#7c6ff7' : '#8888aa',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              Сервер
            </button>
            <button
              onClick={() => setPreviewMode('architecture')}
              style={{
                padding: '4px 10px',
                background: previewMode === 'architecture' ? 'rgba(124, 111, 247, 0.2)' : 'transparent',
                border: 'none',
                color: previewMode === 'architecture' ? '#7c6ff7' : '#8888aa',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 500,
                borderLeft: '1px solid #2a2a3e',
              }}
            >
              🧠 Сеть
            </button>
          </div>
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            background: config.status === 'running' ? 'rgba(76, 175, 80, 0.2)' :
              config.status === 'starting' ? 'rgba(255, 152, 0, 0.2)' :
                config.status === 'error' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(136, 136, 170, 0.2)',
            color: config.status === 'running' ? '#4caf50' :
              config.status === 'starting' ? '#ff9800' :
                config.status === 'error' ? '#f44336' : '#8888aa',
            borderRadius: 12,
            fontWeight: 500,
          }}>
            {config.status === 'running' ? '● запущен' :
              config.status === 'starting' ? '◐ запускается' :
                config.status === 'error' ? '✕ ошибка' : '○ ожидает'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setShowConfig(!showConfig)} title="Настройки"
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#8888aa',
            }}>⚙</button>
          <button onClick={onClose} title="Закрыть"
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#8888aa',
            }}>✕</button>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div style={{ padding: 16, borderBottom: '1px solid #1a1a2e', background: '#0a0a0f' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#8888aa', marginBottom: 6 }}>КОМАНДА</label>
            <input type="text" value={config.command}
              onChange={e => setConfig(prev => ({ ...prev, command: e.target.value }))}
              style={{
                width: '100%', padding: '10px 12px', background: '#1a1a2e', border: '1px solid #2a2a3e',
                borderRadius: 6, color: '#e8e8e8', fontSize: 13, fontFamily: 'Consolas, monospace', outline: 'none',
              }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#8888aa', marginBottom: 6 }}>РАБОЧАЯ ДИРЕКТОРИЯ</label>
            <input type="text" value={config.cwd} placeholder="(по умолчанию)"
              onChange={e => setConfig(prev => ({ ...prev, cwd: e.target.value }))}
              style={{
                width: '100%', padding: '10px 12px', background: '#1a1a2e', border: '1px solid #2a2a3e',
                borderRadius: 6, color: '#e8e8e8', fontSize: 13, fontFamily: 'Consolas, monospace', outline: 'none',
              }} />
          </div>
          <button onClick={serverRunning ? handleStopServer : handleStartServer}
            style={{
              width: '100%', padding: '12px',
              background: serverRunning
                ? 'linear-gradient(135deg, #f44336 0%, #e57373 100%)'
                : 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
              border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
            }}>
            {serverRunning ? 'Остановить сервер' : 'Запустить сервер'}
          </button>
        </div>
      )}

      {/* Server Output */}
      {config.output.length > 0 && (
        <div ref={outputRef} style={{
          padding: '12px 16px', borderBottom: '1px solid #1a1a2e',
          maxHeight: 200, overflowY: 'auto', background: '#0a0a0f',
          fontFamily: 'Consolas, monospace', fontSize: 12, color: '#8888aa',
        }}>
          {config.output.map((line, index) => (
            <div key={index} style={{ marginBottom: 4, lineHeight: 1.5 }}>{line}</div>
          ))}
        </div>
      )}

      {/* Preview Content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f0f1a',
      }}>
        {previewMode === 'server' ? (
          serverRunning ? (
            <iframe src={iframeSrc} title="Preview"
              style={{ width: '100%', height: '100%', border: 'none', background: 'white' }} />
          ) : (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ textAlign: 'center', padding: 40, maxWidth: 400 }}>
                <div style={{
                  width: 80, height: 80, margin: '0 auto 24px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', background: '#1a1a2e', borderRadius: 16, fontSize: 32,
                }}>👁</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#e8e8e8', marginBottom: 12 }}>
                  Предпросмотр приложения
                </h3>
                <p style={{ fontSize: 14, color: '#8888aa', lineHeight: 1.6, marginBottom: 24 }}>
                  Нажмите "Запустить сервер" для просмотра фронтенда
                </p>
                <button onClick={handleStartServer}
                  style={{
                    padding: '12px 32px', background: 'linear-gradient(135deg, #7c6ff7 0%, #9d8fff 100%)',
                    border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer',
                    fontSize: 14, fontWeight: 600,
                  }}>
                  Запустить сервер
                </button>
              </div>
            </div>
          )
        ) : teacherAnalysis?.architecture ? (
          <NeuralNetVisualizer
            architecture={teacherAnalysis.architecture}
            parameters={teacherAnalysis.parameters}
          />
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ textAlign: 'center', padding: 40, maxWidth: 400 }}>
              <div style={{
                width: 80, height: 80, margin: '0 auto 24px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: '#1a1a2e', borderRadius: 16, fontSize: 32,
              }}>🧠</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#e8e8e8', marginBottom: 12 }}>
                Архитектура нейросети
              </h3>
              <p style={{ fontSize: 14, color: '#8888aa', lineHeight: 1.6, marginBottom: 8 }}>
                Сначала выберите Teacher модель в панели «Модели»
              </p>
              <p style={{ fontSize: 13, color: '#666688', marginBottom: 24 }}>
                После анализа данных переключитесь на вкладку «🧠 Сеть»
              </p>
              <button
                onClick={() => {
                  const modelsButton = document.querySelector('[data-panel="models"]') as HTMLElement;
                  modelsButton?.click();
                }}
                style={{
                  padding: '12px 32px', background: 'linear-gradient(135deg, #7c6ff7 0%, #9d8fff 100%)',
                  border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600,
                }}>
                Открыть панель моделей
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid #1a1a2e', background: '#0a0a0f',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={handleClearOutput}
          style={{
            padding: '6px 12px', background: 'transparent', border: '1px solid #1a1a2e',
            borderRadius: 6, color: '#8888aa', cursor: 'pointer', fontSize: 12,
          }}>Очистить лог</button>
        <div style={{ fontSize: 12, color: '#8888aa' }}>Порт: {config.port}</div>
      </div>
    </div>
  );
}
