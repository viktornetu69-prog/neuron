import React from 'react';
import { HeaderBar } from './HeaderBar';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
  onTogglePreview: () => void;
  isPreviewOpen: boolean;
  activePanel: string;
  onPanelChange: (panel: string) => void;
  onCheckServer: () => void;
}

export function AppLayout({
  children,
  sidebarExpanded,
  onToggleSidebar,
  onTogglePreview,
  isPreviewOpen,
  activePanel,
  onPanelChange,
  onCheckServer,
}: AppLayoutProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: '#0a0a0f',
      overflow: 'hidden',
    }}>
      {/* Header Bar */}
      <HeaderBar
        onToggleSidebar={onToggleSidebar}
        isSidebarExpanded={sidebarExpanded}
        onTogglePreview={onTogglePreview}
        isPreviewOpen={isPreviewOpen}
      />

      {/* Main content area */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Sidebar */}
        <Sidebar
          expanded={sidebarExpanded}
          activePanel={activePanel}
          onPanelChange={onPanelChange}
          onCheckServer={onCheckServer}
          onToggle={onToggleSidebar}
        />

        {/* Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}
