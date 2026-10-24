import React, { useState, useCallback, useEffect } from 'react';
import { AppLayout } from './components/AppLayout';
import { ChatArea } from './components/ChatArea';
import { ModelsPanel } from './components/ModelsPanel';
import { StatusBar } from './components/StatusBar';
import { PluginManagerPanel } from './components/PluginManager';
import { PreviewPanel } from './components/PreviewPanel';
import { checkHealth, sendChat } from '@/api.client';
import { Plugin } from '@/types';

type Panel = 'chat' | 'models' | 'datasets' | 'stage6' | 'plugins' | 'settings';

interface AppState {
  panel: Panel;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  inputText: string;
  serverStatus: string;
  isServerAvailable: boolean;
  loading: boolean;
  plugins: Plugin[];
  showPreview: boolean;
  isPreviewServerRunning: boolean;
}

export default function App() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [state, setState] = useState<AppState>({
    panel: 'chat',
    messages: [],
    inputText: '',
    serverStatus: 'connecting...',
    isServerAvailable: false,
    loading: false,
    plugins: [],
    showPreview: false,
    isPreviewServerRunning: false,
  });

  useEffect(() => {
    checkServer();
    loadPlugins();
  }, []);

  const loadPlugins = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, plugins: [] }));
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
  }, []);

  const checkServer = useCallback(async () => {
    try {
      const health = await checkHealth();
      setState((prev) => ({
        ...prev,
        serverStatus: health.status === 'healthy' ? 'ready' : 'error',
        isServerAvailable: health.status === 'healthy',
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        serverStatus: 'Server not available',
        isServerAvailable: false,
      }));
    }
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage = {
      role: 'user' as const,
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      inputText: '',
      loading: true,
    }));

    try {
      const response = await sendChat(text, state.messages);
      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            role: 'assistant' as const,
            content: response.is_error ? `⚠️ ${response.message}` : response.message,
            timestamp: new Date().toLocaleTimeString(),
          },
        ],
        loading: false,
      }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            role: 'assistant' as const,
            content: `⚠️ Failed to connect to server: ${msg}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ],
        loading: false,
      }));
    }
  }, [state.messages]);

  const handleClearChat = useCallback(() => {
    setState((prev) => ({ ...prev, messages: [] }));
  }, []);

  const togglePreview = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showPreview: !prev.showPreview,
    }));
  }, []);

  const handleTogglePreviewServer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPreviewServerRunning: !prev.isPreviewServerRunning,
    }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarExpanded(prev => !prev);
  }, []);

  return (
    <AppLayout
      sidebarExpanded={sidebarExpanded}
      onToggleSidebar={toggleSidebar}
      onTogglePreview={togglePreview}
      isPreviewOpen={state.showPreview}
      activePanel={state.panel}
      onPanelChange={(panel) => setState((prev) => ({ ...prev, panel: panel as Panel }))}
      onCheckServer={checkServer}
    >
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        <div style={{
          flex: state.showPreview ? 1 : 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRight: state.showPreview ? '1px solid #1a1a2e' : 'none',
        }}>
          {state.panel === 'chat' ? (
            <ChatArea
              messages={state.messages}
              inputText={state.inputText}
              onInputTextChange={(text) => setState((prev) => ({ ...prev, inputText: text }))}
              onSendMessage={handleSendMessage}
              onClearChat={handleClearChat}
              isLoading={state.loading}
              isServerAvailable={state.isServerAvailable}
            />
          ) : state.panel === 'models' ? (
            <ModelsPanel isServerAvailable={state.isServerAvailable} />
          ) : state.panel === 'plugins' ? (
            <PluginManagerPanel />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8888aa' }}>
              <div style={{ textAlign: 'center' }}>
                <h2>Panel: {state.panel}</h2>
                <p style={{ marginTop: 8, fontSize: 14 }}>In development...</p>
              </div>
            </div>
          )}
          <StatusBar status={state.serverStatus} isServerAvailable={state.isServerAvailable} />
        </div>
        {state.showPreview && (
          <PreviewPanel
            isOpen={state.showPreview}
            onClose={togglePreview}
            serverRunning={state.isPreviewServerRunning}
            onToggleServer={handleTogglePreviewServer}
          />
        )}
      </div>
    </AppLayout>
  );
}
