import React, { useState, useCallback, useEffect } from 'react';
import { AppLayout } from './components/AppLayout';
import { ChatArea } from './components/ChatArea';
import { ChatModeSelector } from './components/ChatModeSelector';
import { ModelsPanel } from './components/ModelsPanel';
import { DatasetPanel } from './components/DatasetPanel';
import { BenchmarkPanel } from './components/BenchmarkPanel';
import { StatusBar } from './components/StatusBar';
import { PluginManagerPanel } from './components/PluginManager';
import { SettingsPanel } from './components/SettingsPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { checkHealth } from '@/api.client';
import { sendChatToMode, exportChatHistory } from '@/api.client';
import { Plugin } from '@/types';
import { DatasetAnalysisResult } from '@/types/dataset-panel.types';
import { ChatMode, ChatMessage } from '@/types';

type Panel = 'chat' | 'models' | 'datasets' | 'benchmark' | 'stage6' | 'plugins' | 'settings';

interface AppState {
  panel: Panel;
  messages: ChatMessage[];
  inputText: string;
  serverStatus: string;
  isServerAvailable: boolean;
  loading: boolean;
  plugins: Plugin[];
  showPreview: boolean;
  isPreviewServerRunning: boolean;
  teacherAnalysis: any | null;
  datasetAnalysis: DatasetAnalysisResult | null;
  chatMode: ChatMode;
  isTeacherLoaded: boolean;
  isStudentAvailable: boolean;
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
    teacherAnalysis: null,
    datasetAnalysis: null,
    chatMode: 'human-teacher',
    isTeacherLoaded: false,
    isStudentAvailable: false,
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

  const handleChatModeChange = useCallback((mode: ChatMode) => {
    setState((prev) => ({
      ...prev,
      chatMode: mode,
      messages: [],
    }));
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      role: 'human',
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
      const mode = state.chatMode;

      // Формируем историю для отправки на бэкенд
      const apiHistory: Array<{ role: string; content: string; timestamp: string }> = state.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));

      if (mode === 'human-teacher') {
        // Обычный запрос без streaming
        const response = await sendChatToMode(mode, text, apiHistory);

        if (response.success && response.responses) {
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, ...response.responses],
            loading: false,
          }));
        } else {
          throw new Error(response.error || 'Failed to get response');
        }
      } else if (mode === 'human-teacher-student') {
        // Для human-teacher-student используем обычный endpoint
        const response = await sendChatToMode(mode, text, apiHistory);

        if (response.success && response.responses) {
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, ...response.responses],
            loading: false,
          }));
        } else {
          throw new Error(response.error || 'Failed to get response');
        }
      } else if (mode === 'human-student') {
        // Обычный запрос без streaming
        const response = await sendChatToMode(mode, text, apiHistory);

        if (response.success && response.responses) {
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, ...response.responses],
            loading: false,
          }));
        } else {
          throw new Error(response.error || 'Failed to get response');
        }
      } else if (mode === 'teacher-student') {
        // Для teacher-student используем обычный endpoint (не streaming)
        const response = await sendChatToMode(mode, text, apiHistory);

        if (response.success && response.history_entry) {
          // Добавляем весь диалог как одно consolidated сообщение
          const dialogueMessages = response.history_entry.messages.map((msg: ChatMessage) => ({
            ...msg,
            timestamp: msg.timestamp || new Date().toLocaleTimeString(),
          }));
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, ...dialogueMessages],
            loading: false,
          }));
        } else {
          throw new Error(response.error || 'Failed to get response');
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Chat error:', error);
      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            role: 'human',
            content: `⚠️ ${msg}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ],
        loading: false,
      }));
    }
  }, [state.chatMode, state.messages]);

  const handleClearChat = useCallback(() => {
    setState((prev) => ({ ...prev, messages: [] }));
  }, []);

  const handleExportHistory = useCallback(async () => {
    try {
      const response = await exportChatHistory(state.chatMode, state.messages);

      if (response.success && response.export_data) {
        // Создаем JSON файл для скачивания
        const jsonStr = JSON.stringify(response.export_data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-history-${state.chatMode}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [state.chatMode, state.messages]);

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

  const handleOpenSettings = useCallback(() => {
    setState((prev) => ({ ...prev, panel: 'settings' as Panel }));
  }, []);

  const handleTeacherAnalysisChange = useCallback((analysis: any | null) => {
    setState(prev => ({ ...prev, teacherAnalysis: analysis, isTeacherLoaded: !!analysis }));
  }, []);

  const handleDatasetAnalysisChange = useCallback((analysis: DatasetAnalysisResult | null) => {
    setState(prev => ({ ...prev, datasetAnalysis: analysis }));
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
      onOpenSettings={handleOpenSettings}
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
            <>
              <ChatModeSelector
                selectedMode={state.chatMode}
                onChange={handleChatModeChange}
                isTeacherLoaded={state.isTeacherLoaded}
                isStudentAvailable={state.isStudentAvailable}
              />
              <ChatArea
                messages={state.messages}
                inputText={state.inputText}
                onInputTextChange={(text) => setState((prev) => ({ ...prev, inputText: text }))}
                onSendMessage={handleSendMessage}
                onClearChat={handleClearChat}
                isLoading={state.loading}
                isServerAvailable={state.isServerAvailable}
                chatMode={state.chatMode}
                onExportHistory={handleExportHistory}
              />
            </>
          ) : state.panel === 'models' ? (
            <ModelsPanel
              isServerAvailable={state.isServerAvailable}
              onTeacherAnalysisChange={handleTeacherAnalysisChange}
            />
          ) : state.panel === 'plugins' ? (
            <PluginManagerPanel />
          ) : state.panel === 'datasets' ? (
            <DatasetPanel
              isServerAvailable={state.isServerAvailable}
              onDatasetAnalysisChange={handleDatasetAnalysisChange}
            />
          ) : state.panel === 'benchmark' ? (
            <BenchmarkPanel
              isServerAvailable={state.isServerAvailable}
            />
          ) : state.panel === 'settings' ? (
            <SettingsPanel />
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
            teacherAnalysis={state.teacherAnalysis}
          />
        )}
      </div>
    </AppLayout>
  );
}
