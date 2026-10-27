/**
 * PluginManager с toggle вкл/выкл и настройками плагина
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getAllPlugins, togglePlugin } from '@/api.client';
import { Plugin } from '@/types';

export function PluginManagerPanel() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlugin, setActivePlugin] = useState<string | null>(null);
  const [pluginConfig, setPluginConfig] = useState<any>(null);
  const [filter, setFilter] = useState<string>('all');

  const loadPlugins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllPlugins();
      const loadedPlugins: Plugin[] = (response.plugins || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        version: p.version || '1.0.0',
        description: p.description || '',
        category: p.category,
        capabilities: p.capabilities || [],
        has_ui: p.has_ui,
        ui_position: p.ui_position,
        sidebar_icon: p.sidebar_icon,
        sidebar_label: p.sidebar_label,
        is_builtin: p.is_builtin,
        enabled: p.enabled,
        state: p.state,
        file_path: p.file_path,
        file_size: p.file_size,
        created_at: p.created_at,
        loaded_at: p.loaded_at,
        error_message: p.error_message,
        dependencies: p.dependencies,
      }));
      setPlugins(loadedPlugins);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(`Не удалось загрузить плагины: ${msg}`);
      setPlugins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlugins();
    // Auto-refresh каждые 3 секунды
    const interval = setInterval(loadPlugins, 3000);
    return () => clearInterval(interval);
  }, [loadPlugins]);

  const handleToggle = async (pluginId: string) => {
    try {
      await togglePlugin(pluginId);
      // Перезагружаем
      loadPlugins();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(`Не удалось переключить плагин: ${msg}`);
    }
  };

  const handlePluginClick = async (pluginId: string) => {
    setActivePlugin(pluginId);
    // Загружаем config плагина
    try {
      const { executePluginMethod } = await import('@/api.client');
      const result = await executePluginMethod(pluginId, 'get_ui_config');
      setPluginConfig(result);
    } catch (error) {
      console.error('Failed to load plugin config:', error);
      setPluginConfig(null);
    }
  };

  const filteredPlugins = plugins.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'enabled') return p.state === 'enabled';
    if (filter === 'disabled') return p.state !== 'enabled';
    if (filter === 'builtin') return p.is_builtin;
    return true;
  });

  const enabledCount = plugins.filter(p => p.state === 'enabled').length;
  const totalCount = plugins.length;

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', gap: 24, overflow: 'hidden' }}>
      {/* Left: Plugin List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e8e8e8', margin: 0 }}>🔌 Менеджер Плагинов</h2>
            <p style={{ fontSize: 13, color: '#8888aa', margin: '4px 0 0' }}>
              {enabledCount} из {totalCount} плагинов активно
            </p>
          </div>
          <button onClick={loadPlugins} style={{
            padding: '6px 12px', background: '#7c6ff7', border: 'none',
            borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 12,
          }}>
            ↻ Обновить
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { id: 'all', label: 'Все', count: totalCount },
            { id: 'enabled', label: 'Активные', count: enabledCount },
            { id: 'disabled', label: 'Неактивные', count: totalCount - enabledCount },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '6px 12px',
              background: filter === f.id ? '#7c6ff7' : '#1a1a2e',
              border: `1px solid ${filter === f.id ? '#7c6ff7' : '#2a2a3e'}`,
              borderRadius: 6,
              color: filter === f.id ? 'white' : '#8888aa',
              cursor: 'pointer', fontSize: 12,
            }}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Plugin Cards */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredPlugins.map((plugin) => (
            <div key={plugin.id}
              onClick={() => handlePluginClick(plugin.id)}
              style={{
                padding: 16,
                background: activePlugin === plugin.id ? 'rgba(124, 111, 247, 0.1)' : '#121220',
                border: `1px solid ${activePlugin === plugin.id ? '#7c6ff7' : '#1e1e30'}`,
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{plugin.sidebar_icon}</span>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e8e8e8', margin: 0 }}>{plugin.sidebar_label || plugin.name}</h3>
                    <p style={{ fontSize: 12, color: '#8888aa', margin: '4px 0 0' }}>{plugin.description}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggle(plugin.id); }}
                  style={{
                    width: 56, height: 28, borderRadius: 14, border: 'none',
                    background: plugin.state === 'enabled' ? '#4caf50' : '#333344',
                    cursor: 'pointer', position: 'relative',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 3,
                    left: plugin.state === 'enabled' ? 31 : 3,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }} />
                </button>
              </div>

              {/* Status and Info */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  padding: '4px 10px',
                  background: plugin.state === 'enabled' ? 'rgba(76, 175, 80, 0.15)' :
                    plugin.state === 'error' ? 'rgba(244, 67, 54, 0.15)' : 'rgba(136, 136, 170, 0.15)',
                  borderRadius: 6, fontSize: 11,
                  color: plugin.state === 'enabled' ? '#4caf50' :
                    plugin.state === 'error' ? '#f44336' : '#8888aa',
                }}>
                  {plugin.state === 'enabled' ? '● Активен' :
                   plugin.state === 'error' ? `✕ ${plugin.error_message || 'Ошибка'}` :
                   plugin.state}
                </span>
                <span style={{
                  padding: '4px 10px',
                  background: '#1a1a2e',
                  borderRadius: 6, fontSize: 11, color: '#8888aa',
                }}>
                  v{plugin.version}
                </span>
                <span style={{
                  padding: '4px 10px',
                  background: 'rgba(124, 111, 247, 0.15)',
                  borderRadius: 6, fontSize: 11, color: '#7c6ff7',
                }}>
                  {plugin.category.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Plugin Details (shows when plugin selected) */}
      {activePlugin && (
        <div style={{ width: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e8e8e8', marginBottom: 16 }}>
            {plugins.find(p => p.id === activePlugin)?.sidebar_icon} {plugins.find(p => p.id === activePlugin)?.sidebar_label || activePlugin}
          </h3>

          {pluginConfig ? (
            <pre style={{
              flex: 1, padding: 16, background: '#121220', borderRadius: 8,
              border: '1px solid #1e1e30', fontSize: 12, color: '#8888aa',
              overflow: 'auto',
            }}>
              {JSON.stringify(pluginConfig, null, 2)}
            </pre>
          ) : (
            <div style={{ color: '#8888aa' }}>Загрузка конфига плагина...</div>
          )}

          {/* Capabilities */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: '#8888aa', marginBottom: 8 }}>ВОЗМОЖНОСТИ:</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {plugins.find(p => p.id === activePlugin)?.capabilities?.map((cap) => (
                <span key={cap} style={{
                  padding: '4px 8px',
                  background: '#1a1a2e',
                  borderRadius: 4,
                  fontSize: 11,
                  color: '#666',
                }}>
                  {cap}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
