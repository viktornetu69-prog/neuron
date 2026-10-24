/**
 * DistributionView — компонент визуализации распределения данных
 * Отображает статистику и информационные карточки по колонкам
 */

import React from 'react';
import { DatasetFile } from '@/types/dataset-panel.types';

interface DistributionViewProps {
  dataset: DatasetFile;
}

export const DistributionView: React.FC<DistributionViewProps> = ({ dataset }) => {
  const { statistics } = dataset;

  if (!statistics) {
    return (
      <div style={styles.emptyState}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📈</div>
        <p style={{ color: '#666688', margin: 0 }}>Статистика недоступна. Выполните анализ датасета.</p>
      </div>
    );
  }

  const statItems = [
    {
      icon: '⭐',
      label: 'Качество данных',
      value: statistics.qualityScore ? `${(statistics.qualityScore * 100).toFixed(1)}%` : 'N/A',
      color: statistics.qualityScore && statistics.qualityScore > 0.7
        ? '#4caf50'
        : statistics.qualityScore && statistics.qualityScore > 0.4
        ? '#ff9800'
        : '#f44336',
    },
    {
      icon: '⚠️',
      label: 'Пропущенные значения',
      value: statistics.missingValues?.toLocaleString() || '0',
      color: statistics.missingValues && statistics.missingValues > 0 ? '#f44336' : '#4caf50',
    },
    {
      icon: '📊',
      label: 'Среднее (min)',
      value: statistics.min?.map(v => v.toFixed(2)).join(', ') || 'N/A',
      color: '#e8e8e8',
    },
    {
      icon: '📈',
      label: 'Среднее (max)',
      value: statistics.max?.map(v => v.toFixed(2)).join(', ') || 'N/A',
      color: '#e8e8e8',
    },
    {
      icon: '📉',
      label: 'Среднее (mean)',
      value: statistics.mean?.map(v => v.toFixed(2)).join(', ') || 'N/A',
      color: '#7c6ff7',
    },
    {
      icon: '📏',
      label: 'Std (отклонение)',
      value: statistics.std?.map(v => v.toFixed(2)).join(', ') || 'N/A',
      color: '#7c6ff7',
    },
  ];

  return (
    <div style={styles.container}>
      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        {statItems.map((item, index) => (
          <div key={index} style={styles.statCard}>
            <div style={styles.statHeader}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={styles.statLabel}>{item.label}</span>
            </div>
            <div style={{ ...styles.statValue, color: item.color }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Distribution Bars Visualization */}
      {statistics.mean && statistics.std && statistics.mean.length > 0 && (
        <div style={styles.distributionSection}>
          <h3 style={{ color: '#e8e8e8', margin: '0 0 16px', fontSize: 16 }}>
            📊 Визуализация распределения
          </h3>
          <div style={styles.barsContainer}>
            {statistics.mean.map((mean, index) => {
              const std = statistics.std?.[index] || 0;
              const min = statistics.min?.[index] || 0;
              const max = statistics.max?.[index] || 0;
              const range = max - min || 1;
              const normalizedPos = ((mean - min) / range) * 100;
              const normalizedWidth = Math.min((std / range) * 100, 50);

              return (
                <div key={index} style={styles.barRow}>
                  <div style={styles.barLabel}>Col {index + 1}</div>
                  <div style={styles.barTrack}>
                    <div style={styles.barError}>
                      <div
                        style={{
                          ...styles.barStd,
                          left: `${Math.max(0, normalizedPos - normalizedWidth / 2)}%`,
                          width: `${Math.max(4, normalizedWidth)}%`,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        ...styles.barMean,
                        left: `${normalizedPos}%`,
                      }}
                    />
                  </div>
                  <div style={styles.barValue}>{mean.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: '#7c6ff7' }} />
              <span style={{ color: '#8888aa', fontSize: 11 }}>Среднее</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: 'rgba(124, 111, 247, 0.3)', height: 8 }} />
              <span style={{ color: '#8888aa', fontSize: 11 }}>±1 Std</span>
            </div>
          </div>
        </div>
      )}

      {/* Quality Assessment */}
      <div style={styles.qualitySection}>
        <h3 style={{ color: '#e8e8e8', margin: '0 0 16px', fontSize: 16 }}>
          🔍 Оценка качества
        </h3>
        <div style={styles.qualityBar}>
          {statistics.qualityScore ? (
            <div
              style={{
                ...styles.qualityFill,
                width: `${statistics.qualityScore * 100}%`,
                background: statistics.qualityScore > 0.7
                  ? 'linear-gradient(90deg, #4caf50, #66bb6a)'
                  : statistics.qualityScore > 0.4
                  ? 'linear-gradient(90deg, #ff9800, #ffb74d)'
                  : 'linear-gradient(90deg, #f44336, #ef5350)',
              }}
            />
          ) : (
            <div style={{ ...styles.qualityFill, width: 0 }} />
          )}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          fontSize: 12,
          color: '#8888aa',
        }}>
          <span>0%</span>
          <span style={{
            color: statistics.qualityScore && statistics.qualityScore > 0.7
              ? '#4caf50'
              : statistics.qualityScore && statistics.qualityScore > 0.4
              ? '#ff9800'
              : '#f44336',
            fontWeight: 600,
          }}>
            {statistics.qualityScore ? (statistics.qualityScore * 100).toFixed(0) : 0}%
          </span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    color: '#666688',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  statCard: {
    padding: 16,
    background: '#1a1a2e',
    borderRadius: 8,
    border: '1px solid #2a2a3e',
  },
  statHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statLabel: {
    color: '#8888aa',
    fontSize: 12,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'monospace',
  },
  distributionSection: {
    padding: 16,
    background: '#1a1a2e',
    borderRadius: 8,
    border: '1px solid #2a2a3e',
  },
  barsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  barLabel: {
    color: '#8888aa',
    fontSize: 11,
    minWidth: 50,
  },
  barTrack: {
    flex: 1,
    height: 24,
    background: '#0a0a0f',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  barError: {
    position: 'absolute',
    top: 4,
    bottom: 4,
  },
  barStd: {
    height: '100%',
    background: 'rgba(124, 111, 247, 0.3)',
    borderRadius: 2,
  },
  barMean: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    background: '#7c6ff7',
    borderRadius: 1,
    transform: 'translateX(-50%)',
  },
  barValue: {
    color: '#e8e8e8',
    fontSize: 11,
    minWidth: 40,
    fontFamily: 'monospace',
  },
  legend: {
    display: 'flex',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid #2a2a3e',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
  },
  qualitySection: {
    padding: 16,
    background: '#1a1a2e',
    borderRadius: 8,
    border: '1px solid #2a2a3e',
  },
  qualityBar: {
    height: 12,
    background: '#0a0a0f',
    borderRadius: 6,
    overflow: 'hidden',
  },
  qualityFill: {
    height: '100%',
    borderRadius: 6,
    transition: 'width 0.5s ease',
  },
};
