/**
 * DatasetDetailsPanel — панель деталей датасета
 * Отображает подробную информацию, превью, статистику и визуализацию
 */

import React, { useState } from 'react';
import { DatasetFile } from '@/types/dataset-panel.types';
import { DataView } from './DataView';
import { DistributionView } from './DistributionView';
import { ArchitectureView } from './ArchitectureView';

interface DatasetDetailsPanelProps {
  dataset: DatasetFile;
  onAnalyze: () => void;
  isServerAvailable: boolean;
}

export const DatasetDetailsPanel: React.FC<DatasetDetailsPanelProps> = ({
  dataset,
  onAnalyze,
  isServerAvailable,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'statistics' | 'architecture'>('preview');

  const tabs = [
    { id: 'preview' as const, label: 'Предпросмотр', icon: '👁️' },
    { id: 'statistics' as const, label: 'Статистика', icon: '📈' },
    { id: 'architecture' as const, label: 'Архитектура', icon: '🏗️' },
  ];

  const getTypeColor = (): string => {
    switch (dataset.type) {
      case 'training': return '#4caf50';
      case 'validation': return '#ff9800';
      case 'test': return '#2196f3';
      default: return '#8888aa';
    }
  };

  const getTypeIcon = (): string => {
    switch (dataset.type) {
      case 'training': return '🎓';
      case 'validation': return '🔍';
      case 'test': return '🧪';
      default: return '📁';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: `${getTypeColor()}20`,
              border: `2px solid ${getTypeColor()}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
            }}>
              {getTypeIcon()}
            </div>

            <div style={{ flex: 1 }}>
              <h2 style={{
                color: '#e8e8e8',
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {dataset.name}
              </h2>
              <div style={{
                color: '#8888aa',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span>{dataset.format.toUpperCase()}</span>
                <span>•</span>
                <span>{formatFileSize(dataset.size)}</span>
                <span>•</span>
                <span style={{
                  color: getTypeColor(),
                  fontWeight: 500,
                }}>
                  {dataset.type === 'training' ? 'Тренировочный' :
                   dataset.type === 'validation' ? 'Валидационный' :
                   dataset.type === 'test' ? 'Тестовый' : 'Неизвестный'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onAnalyze}
            disabled={!isServerAvailable}
            style={{
              padding: '8px 16px',
              background: isServerAvailable ? '#7c6ff7' : '#1a1a2e',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: isServerAvailable ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            🔍 Анализ
          </button>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsRow}>
          <StatCard icon="📊" label="Строки" value={dataset.rowCount?.toLocaleString() || 'N/A'} />
          <StatCard icon="📋" label="Столбцы" value={dataset.columnCount?.toLocaleString() || 'N/A'} />
          <StatCard
            icon="⚠️"
            label="Пропуски"
            value={dataset.statistics?.missingValues?.toLocaleString() || '0'}
            color={dataset.statistics?.missingValues && dataset.statistics.missingValues > 0 ? '#f44336' : '#4caf50'}
          />
          <StatCard
            icon="⭐"
            label="Качество"
            value={dataset.statistics?.qualityScore ? (dataset.statistics.qualityScore * 100).toFixed(0) + '%' : 'N/A'}
            color={dataset.statistics?.qualityScore && dataset.statistics.qualityScore > 0.7
              ? '#4caf50'
              : dataset.statistics?.qualityScore && dataset.statistics.qualityScore > 0.4
              ? '#ff9800'
              : '#f44336'}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              background: activeTab === tab.id ? '#1a1a2e' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #7c6ff7' : '2px solid transparent',
              color: activeTab === tab.id ? '#e8e8e8' : '#8888aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {activeTab === 'preview' && (
          <DataView dataset={dataset} />
        )}
        {activeTab === 'statistics' && (
          <DistributionView dataset={dataset} />
        )}
        {activeTab === 'architecture' && (
          <ArchitectureView dataset={dataset} />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({ icon, label, value, color = '#e8e8e8' }: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statHeader}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={styles.statLabel}>{label}</span>
      </div>
      <div style={{ ...styles.statValue, color }}>{value}</div>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  header: {
    padding: '20px',
    borderBottom: '1px solid #2a2a3e',
    background: '#0a0a0f',
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
  },
  statCard: {
    padding: '12px 14px',
    background: '#1a1a2e',
    borderRadius: 8,
    border: '1px solid #2a2a3e',
  },
  statHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statLabel: {
    color: '#8888aa',
    fontSize: 11,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 600,
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #2a2a3e',
    background: '#0a0a0f',
  },
  tabContent: {
    flex: 1,
    overflow: 'hidden',
  },
};
