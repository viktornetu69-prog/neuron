/**
 * DatasetCard — компонент карточки датасета в списке
 * Отображает основную информацию о датасете с иконками и метриками
 */

import React from 'react';
import { DatasetFile } from '@/types/dataset-panel.types';

interface DatasetCardProps {
  dataset: DatasetFile;
  onClick: (dataset: DatasetFile) => void;
  isSelected: boolean;
  isServerAvailable: boolean;
}

export const DatasetCard: React.FC<DatasetCardProps> = ({
  dataset,
  onClick,
  isSelected,
  isServerAvailable,
}) => {
  const getTypeIcon = (): string => {
    switch (dataset.type) {
      case 'training': return '🎓';
      case 'validation': return '🔍';
      case 'test': return '🧪';
      default: return '📁';
    }
  };

  const getFormatIcon = (): string => {
    const icons: Record<string, string> = {
      csv: '📊',
      json: '📝',
      parquet: '🗂️',
      tfrecord: '🔄',
      image: '🖼️',
      npy: '🔢',
      jsonl: '📃',
      manifest: '📋',
    };
    return icons[dataset.format] || '📄';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      onClick={() => isServerAvailable && onClick(dataset)}
      style={{
        padding: 16,
        background: isSelected ? '#1a1a2e' : '#0a0a0f',
        border: isSelected ? '2px solid #7c6ff7' : '1px solid #2a2a3e',
        borderRadius: 8,
        cursor: isServerAvailable ? 'pointer' : 'not-allowed',
        transition: 'all 0.2s ease',
        opacity: !isServerAvailable ? 0.5 : 1,
        ...(isSelected && {
          boxShadow: '0 0 12px rgba(124, 111, 247, 0.3)',
        }),
      }}
      onMouseEnter={(e) => {
        if (!isSelected && isServerAvailable) {
          (e.currentTarget as HTMLElement).style.borderColor = '#4a4a5e';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.borderColor = '#2a2a3e';
        }
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{getTypeIcon()}</span>
          <div>
            <div style={{
              fontSize: 14,
              fontWeight: 'bold',
              color: '#e8e8e8',
              marginBottom: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 180,
            }}>
              {dataset.name}
            </div>
            <div style={{
              fontSize: 11,
              color: '#8888aa',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span>{getFormatIcon()} {dataset.format.toUpperCase()}</span>
              <span>•</span>
              <span>{formatFileSize(dataset.size)}</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div style={{
          padding: '2px 8px',
          borderRadius: 10,
          fontSize: 10,
          fontWeight: 600,
          background: dataset.status === 'ready' ? 'rgba(76, 175, 80, 0.2)' :
                      dataset.status === 'processing' ? 'rgba(255, 152, 0, 0.2)' :
                      'rgba(244, 67, 54, 0.2)',
          color: dataset.status === 'ready' ? '#4caf50' :
                 dataset.status === 'processing' ? '#ff9800' : '#f44336',
        }}>
          {dataset.status === 'ready' ? 'Готов' :
           dataset.status === 'processing' ? 'Обработка' : 'Ошибка'}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8,
        marginTop: 12,
        fontSize: 12,
      }}>
        <StatUnit label="Строки" value={dataset.rowCount?.toLocaleString() || 'N/A'} />
        <StatUnit label="Столбцы" value={dataset.columnCount?.toLocaleString() || 'N/A'} />
        <StatUnit
          label="Качество"
          value={dataset.statistics?.qualityScore
            ? (dataset.statistics.qualityScore * 100).toFixed(0) + '%'
            : 'N/A'}
          color={dataset.statistics?.qualityScore && dataset.statistics.qualityScore > 0.7
            ? '#4caf50'
            : dataset.statistics?.qualityScore && dataset.statistics.qualityScore > 0.4
            ? '#ff9800'
            : '#f44336'}
        />
      </div>

      {/* Quick Stats */}
      {dataset.statistics && (
        <div style={{
          marginTop: 12,
          padding: '8px',
          background: '#0a0a0f',
          borderRadius: 4,
          fontSize: 11,
        }}>
          {dataset.statistics.missingValues && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}>
              <span style={{ color: '#8888aa' }}>Пропуски</span>
              <span style={{ color: '#e8e8e8' }}>
                {dataset.statistics.missingValues.toLocaleString()}
              </span>
            </div>
          )}
          {dataset.statistics.mean && dataset.statistics.mean.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span style={{ color: '#8888aa' }}>Среднее</span>
              <span style={{ color: '#e8e8e8', fontFamily: 'monospace' }}>
                [{dataset.statistics.mean.map(v => v.toFixed(2)).join(', ')}]
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

function StatUnit({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ color: '#8888aa', marginBottom: 2, fontSize: 11 }}>{label}</div>
      <div style={{
        color: color || '#e8e8e8',
        fontWeight: 500,
        fontSize: 13,
      }}>
        {value}
      </div>
    </div>
  );
}
