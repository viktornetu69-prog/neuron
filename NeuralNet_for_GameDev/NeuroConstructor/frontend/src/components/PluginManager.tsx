import React, { useState, useEffect } from 'react';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  type: string;
  capabilities: string[];
  file_path?: string;
  file_size?: number;
  created_at?: string;
}

export function PluginManagerPanel() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newPlugin, setNewPlugin] = useState({
    name: '',
    description: '',
    type: 'default',
    version: '1.0.0',
    capabilities: '',
  });

  const loadPlugins = async () => {
    setLoading(true);
    try {
      // Загружаем плагины из директории
      const fs = await import('fs');
      const path = await import('path');

      const pluginsDir = path.join(__dirname, '..', 'plugins');
      let pluginFiles: string[] = [];

      try {
        pluginFiles = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.json'));
      } catch {
        // Директория может не существовать
        pluginFiles = [];
      }

      const loadedPlugins: Plugin[] = [];
      for (const file of pluginFiles) {
        try {
          const filePath = path.join(pluginsDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const pluginData = JSON.parse(content);
          pluginData.id = file.replace('.json', '');
          pluginData.file_path = filePath;
          pluginData.file_size = fs.statSync(filePath).size;
          loadedPlugins.push(pluginData);
        } catch {
          // Skip invalid files
        }
      }

      setPlugins(loadedPlugins);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load plugins: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  const handleCreatePlugin = async () => {
    if (!newPlugin.name) {
      setError('Name is required');
      return;
    }

    try {
      const pluginData: Partial<Plugin> = {
        name: newPlugin.name,
        description: newPlugin.description,
        type: newPlugin.type,
        version: newPlugin.version,
        capabilities: newPlugin.capabilities
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      };

      // Сохраняем плагин в JSON файл
      const fs = await import('fs');
      const path = await import('path');

      const pluginsDir = path.join(__dirname, '..', 'plugins');
      if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
      }

      const filename = `${newPlugin.name.replace(' ', '_').toLowerCase()}_${newPlugin.version.replace('.', '_')}.json`;
      const filePath = path.join(pluginsDir, filename);

      pluginData.id = filename.replace('.json', '');
      pluginData.created_at = new Date().toISOString();
      pluginData.file_path = filePath;

      fs.writeFileSync(filePath, JSON.stringify(pluginData, null, 2), 'utf-8');

      // Обновляем список
      setPlugins(prev => [...prev, pluginData as Plugin]);
      setOpenCreateDialog(false);
      setNewPlugin({
        name: '',
        description: '',
        type: 'default',
        version: '1.0.0',
        capabilities: '',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create plugin: ${msg}`);
    }
  };

  const handleDeletePlugin = async (pluginId: string) => {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const pluginsDir = path.join(__dirname, '..', 'plugins');
      const files = fs.readdirSync(pluginsDir).filter(f => f.includes(pluginId));

      for (const file of files) {
        fs.unlinkSync(path.join(pluginsDir, file));
      }

      setPlugins(prev => prev.filter(p => p.id !== pluginId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to delete plugin: ${msg}`);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e8e8e8', margin: 0 }}>
          Plugin Manager
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={loadPlugins}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: '#1a1a2e',
              border: '1px solid #2a2a3e',
              borderRadius: 6,
              color: '#8888aa',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 12,
            }}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={() => setOpenCreateDialog(true)}
            style={{
              padding: '8px 16px',
              background: '#7c6ff7',
              border: 'none',
              borderRadius: 6,
              color: 'white',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Create Plugin
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: 12,
          background: 'rgba(244, 67, 54, 0.1)',
          border: '1px solid #f44336',
          borderRadius: 6,
          color: '#f44336',
          marginBottom: 16,
          fontSize: 13,
        }}
        >
          {error}
        </div>
      )}

      {plugins.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 40,
          color: '#8888aa',
          fontSize: 14,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔌</div>
          <p>No plugins installed. Click "Create Plugin" to add your first plugin.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {plugins.map((plugin, index) => (
            <div key={index} style={{
              padding: 16,
              background: '#121220',
              border: '1px solid #1e1e30',
              borderRadius: 8,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 12,
              }}>
                <div>
                  <h3 style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#e8e8e8',
                    margin: '0 0 4px 0',
                  }}>
                    {plugin.name}
                  </h3>
                  <p style={{
                    fontSize: 13,
                    color: '#8888aa',
                    margin: 0,
                  }}>
                    {plugin.description || 'No description'}
                  </p>
                </div>
                <button
                  onClick={() => handleDeletePlugin(plugin.id)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(244, 67, 54, 0.1)',
                    border: '1px solid #f44336',
                    borderRadius: 6,
                    color: '#f44336',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  Delete
                </button>
              </div>
              <div style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}>
                <span style={{
                  padding: '4px 8px',
                  background: '#1a1a2e',
                  borderRadius: 4,
                  fontSize: 11,
                  color: '#8888aa',
                }}>
                  v{plugin.version}
                </span>
                <span style={{
                  padding: '4px 8px',
                  background: 'rgba(124, 111, 247, 0.2)',
                  borderRadius: 4,
                  fontSize: 11,
                  color: '#7c6ff7',
                }}>
                  {plugin.type}
                </span>
                {plugin.capabilities?.map((cap) => (
                  <span key={cap} style={{
                    padding: '4px 8px',
                    background: '#1a1a2e',
                    borderRadius: 4,
                    fontSize: 11,
                    color: '#8888aa',
                  }}>
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Plugin Dialog */}
      {openCreateDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
          onClick={() => setOpenCreateDialog(false)}
        >
          <div style={{
            background: '#121220',
            borderRadius: 12,
            padding: 24,
            width: 500,
            maxWidth: '90%',
            border: '1px solid #1e1e30',
          }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#e8e8e8',
              marginBottom: 16,
            }}>
              Create New Plugin
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  color: '#8888aa',
                  marginBottom: 4,
                }}>Plugin Name</label>
                <input
                  type="text"
                  value={newPlugin.name}
                  onChange={e => setNewPlugin({ ...newPlugin, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#1a1a2e',
                    border: '1px solid #2a2a3e',
                    borderRadius: 6,
                    color: '#e8e8e8',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  color: '#8888aa',
                  marginBottom: 4,
                }}>Description</label>
                <textarea
                  value={newPlugin.description}
                  onChange={e => setNewPlugin({ ...newPlugin, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#1a1a2e',
                    border: '1px solid #2a2a3e',
                    borderRadius: 6,
                    color: '#e8e8e8',
                    fontSize: 13,
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#8888aa',
                    marginBottom: 4,
                  }}>Type</label>
                  <select
                    value={newPlugin.type}
                    onChange={e => setNewPlugin({ ...newPlugin, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#1a1a2e',
                      border: '1px solid #2a2a3e',
                      borderRadius: 6,
                      color: '#e8e8e8',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  >
                    <option value="default">Default</option>
                    <option value="ui">UI Component</option>
                    <option value="processor">Data Processor</option>
                    <option value="generator">Code Generator</option>
                  </select>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#8888aa',
                    marginBottom: 4,
                  }}>Version</label>
                  <input
                    type="text"
                    value={newPlugin.version}
                    onChange={e => setNewPlugin({ ...newPlugin, version: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#1a1a2e',
                      border: '1px solid #2a2a3e',
                      borderRadius: 6,
                      color: '#e8e8e8',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  color: '#8888aa',
                  marginBottom: 4,
                }}>Capabilities (comma-separated)</label>
                <input
                  type="text"
                  value={newPlugin.capabilities}
                  onChange={e => setNewPlugin({ ...newPlugin, capabilities: e.target.value })}
                  placeholder="generate_code, analyze_data, connect_api"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#1a1a2e',
                    border: '1px solid #2a2a3e',
                    borderRadius: 6,
                    color: '#e8e8e8',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
            <div style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid #1e1e30',
            }}>
              <button
                onClick={() => setOpenCreateDialog(false)}
                style={{
                  padding: '10px 20px',
                  background: '#1a1a2e',
                  border: '1px solid #2a2a3e',
                  borderRadius: 6,
                  color: '#8888aa',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlugin}
                style={{
                  padding: '10px 20px',
                  background: '#4caf50',
                  border: 'none',
                  borderRadius: 6,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
