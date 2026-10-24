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
}

export function PreviewPanel({ isOpen, onClose, serverRunning, onToggleServer, teacherAnalysis }: PreviewPanelProps) {
  const [config, setConfig] = useState<ServerConfig>({
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    cwd: 'frontend',
    port: 5173,
    status: 'idle',
    output: [],
  });
  const [iframeSrc, setIframeSrc] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('server');
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [config.output]);

  const handleStartServer = async () => {
    setConfig(prev => ({
      ...prev,
      status: 'starting',
      output: [...prev.output, `[${new Date().toLocaleTimeString()}] Starting preview server...`],
    }));

    try {
      // Simulate server start
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setConfig(prev => ({
        ...prev,
        status: 'running',
        output: [
          ...prev.output,
          `[${new Date().toLocaleTimeString()}] ✓ Preview server started successfully`,
          `[${new Date().toLocaleTimeString()}] → Available at http://127.0.0.1:${prev.port}`,
        ],
      }));
      setIframeSrc(`http://127.0.0.1:${config.port}`);
      onToggleServer();
    } catch (error) {
      setConfig(prev => ({
        ...prev,
        status: 'error',
        output: [
          ...prev.output,
          `[${new Date().toLocaleTimeString()}] ✗ Error: ${error}`,
        ],
      }));
    }
  };

  const handleStopServer = () => {
    setConfig(prev => ({
      ...prev,
      status: 'idle',
      output: [
        ...prev.output,
        `[${new Date().toLocaleTimeString()}] Stopping preview server...`,
      ],
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
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
                title="Предпросмотр сервера"
                style={{
                  padding: '4px 10px',
                  background: previewMode === 'server' ? 'rgba(124, 111, 247, 0.2)' : 'transparent',
                  border: 'none',
                  color: previewMode === 'server' ? '#7c6ff7' : '#8888aa',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
              >
                Сервер
              </button>
              <button
                onClick={() => setPreviewMode('architecture')}
                title="Архитектура модели"
                style={{
                  padding: '4px 10px',
                  background: previewMode === 'architecture' ? 'rgba(124, 111, 247, 0.2)' : 'transparent',
                  border: 'none',
                  color: previewMode === 'architecture' ? '#7c6ff7' : '#8888aa',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  borderLeft: '1px solid #2a2a3e',
                }}
              >
                🧠 Сеть
              </button>
            </div>
            <span style={{
              fontSize: 11,
              padding: '2px 8px',
              background: config.status === 'running' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)',
              color: config.status === 'running' ? '#4caf50' : '#ff9800',
              borderRadius: 12,
              fontWeight: 500,
            }}>
              {config.status === 'running' ? 'запущен' : config.status === 'starting' ? 'запускается' : config.status === 'error' ? 'ошибка' : 'ожидает'}
            </span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <button
            onClick={() => setIframeSrc(iframeSrc)}
            title="Обновить"
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
              fontSize: 14,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1a1a2e')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            ↻
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            title="Настройки"
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
              fontSize: 14,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1a1a2e')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            ⚙
          </button>
          <button
            onClick={onClose}
            title="Закрыть"
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
              fontSize: 16,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1a1a2e')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div style={{
          padding: 16,
          borderBottom: '1px solid #1a1a2e',
          background: '#0a0a0f',
        }}>
          <div style={{
            marginBottom: 12,
          }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              color: '#8888aa',
              marginBottom: 6,
            }}>
              КОМАНДА
            </label>
            <input
              type="text"
              value={config.command}
              onChange={e => setConfig(prev => ({ ...prev, command: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#1a1a2e',
                border: '1px solid #2a2a3e',
                borderRadius: 6,
                color: '#e8e8e8',
                fontSize: 13,
                fontFamily: 'Consolas, monospace',
                outline: 'none',
              }}
            />
          </div>
          <div style={{
            marginBottom: 16,
          }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              color: '#8888aa',
              marginBottom: 6,
            }}>
              РАБОЧАЯ ДИРЕКТОРИЯ
            </label>
            <input
              type="text"
              value={config.cwd}
              onChange={e => setConfig(prev => ({ ...prev, cwd: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#1a1a2e',
                border: '1px solid #2a2a3e',
                borderRadius: 6,
                color: '#e8e8e8',
                fontSize: 13,
                fontFamily: 'Consolas, monospace',
                outline: 'none',
              }}
            />
          </div>
          <button
            onClick={serverRunning ? handleStopServer : handleStartServer}
            style={{
              width: '100%',
              padding: '12px',
              background: serverRunning
                ? 'linear-gradient(135deg, #f44336 0%, #e57373 100%)'
                : 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
          >
            {serverRunning ? 'Остановить сервер' : 'Запустить сервер предпросмотра'}
          </button>
        </div>
      )}

      {/* Server Output */}
      {config.output.length > 0 && (
        <div
          ref={outputRef}
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #1a1a2e',
            maxHeight: 200,
            overflowY: 'auto',
            background: '#0a0a0f',
            fontFamily: 'Consolas, monospace',
            fontSize: 12,
            color: '#8888aa',
          }}
        >
          {config.output.map((line, index) => (
            <div key={index} style={{
              marginBottom: 4,
              lineHeight: 1.5,
            }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Preview Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#0f0f1a',
      }}>
        {previewMode === 'server' ? (
          serverRunning ? (
            <iframe
              src={iframeSrc}
              title="Preview"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'white',
              }}
            />
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                textAlign: 'center',
                padding: 40,
                maxWidth: 400,
              }}>
                <div style={{
                  width: 80,
                  height: 80,
                  margin: '0 auto 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#1a1a2e',
                  borderRadius: 16,
                  fontSize: 32,
                }}>
                  👁
                </div>
                <h3 style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#e8e8e8',
                  marginBottom: 12,
                }}>
                  Предпросмотр приложения
                </h3>
                <p style={{
                  fontSize: 14,
                  color: '#8888aa',
                  lineHeight: 1.6,
                  marginBottom: 24,
                }}>
                  Запустите сервер для просмотра приложения в реальном времени
                </p>
                <button
                  onClick={handleStartServer}
                  style={{
                    padding: '12px 32px',
                    background: 'linear-gradient(135deg, #7c6ff7 0%, #9d8fff 100%)',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
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
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              textAlign: 'center',
              padding: 40,
              maxWidth: 400,
            }}>
              <div style={{
                width: 80,
                height: 80,
                margin: '0 auto 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1a1a2e',
                borderRadius: 16,
                fontSize: 32,
              }}>
                🧠
              </div>
              <h3 style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#e8e8e8',
                marginBottom: 12,
              }}>
                Архитектура нейросети
              </h3>
              <p style={{
                fontSize: 14,
                color: '#8888aa',
                lineHeight: 1.6,
                marginBottom: 24,
              }}>
                Выберите Teacher модель в панели моделей и нажмите анализ, затем переключитесь на вкладку "🧠 Сеть"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #1a1a2e',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <button
          onClick={handleClearOutput}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid #1a1a2e',
            borderRadius: 6,
            color: '#8888aa',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Очистить лог
        </button>
        <div style={{
          fontSize: 12,
          color: '#8888aa',
        }}>
          Порт: {config.port}
        </div>
      </div>
    </div>
  );
}
