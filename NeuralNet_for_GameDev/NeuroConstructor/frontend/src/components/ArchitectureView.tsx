/**
 * ArchitectureView — компонент визуализации рекомендуемой архитектуры нейросети
 * Генерирует визуальную схему на основе типа данных и статистики датасета
 */

import React from 'react';
import { DatasetFile } from '@/types/dataset-panel.types';

interface ArchitectureViewProps {
  dataset: DatasetFile;
}

interface LayerInfo {
  type: 'input' | 'hidden' | 'output';
  name: string;
  neurons: number;
  color: string;
  activation: string;
}

export const ArchitectureView: React.FC<ArchitectureViewProps> = ({ dataset }) => {
  const architecture = generateArchitecture(dataset);

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'input': return '🔵';
      case 'hidden': return '🟢';
      case 'output': return '🟣';
      default: return '⚪';
    }
  };

  return (
    <div style={styles.container}>
      {/* Architecture Diagram */}
      <div style={styles.diagramContainer}>
        <div style={styles.layersRow}>
          {architecture.map((layer, index) => (
            <React.Fragment key={layer.name}>
              {/* Layer Card */}
              <div style={styles.layerWrapper}>
                <div
                  style={{
                    ...styles.layerCard,
                    borderColor: layer.color,
                    boxShadow: `0 4px 16px ${layer.color}40`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${layer.color}60`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${layer.color}40`;
                  }}
                >
                  <div
                    style={{
                      ...styles.neuronBadge,
                      background: layer.color,
                    }}
                  >
                    {layer.neurons}
                  </div>

                  <div style={{
                    ...styles.layerTypeIcon,
                    fontSize: 20,
                  }}>
                    {getTypeIcon(layer.type)}
                  </div>

                  <div style={{
                    ...styles.layerName,
                    color: layer.color,
                  }}>
                    {layer.name}
                  </div>

                  <div style={styles.layerActivation}>
                    {layer.activation}
                  </div>
                </div>

                {/* Layer Type Label */}
                <div style={styles.layerTypeLabel}>
                  {layer.type === 'input' ? 'Входной' : layer.type === 'hidden' ? 'Скрытый' : 'Выходной'}
                </div>
              </div>

              {/* Connection Line */}
              {index < architecture.length - 1 && (
                <div style={styles.connectionLine} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Architecture Info */}
      <div style={styles.infoSection}>
        <h3 style={{ color: '#e8e8e8', margin: '0 0 16px', fontSize: 16 }}>
          📋 Информация об архитектуре
        </h3>

        <div style={styles.infoGrid}>
          <InfoItem label="Тип данных" value={dataset.format.toUpperCase()} />
          <InfoItem
            label="Предполагаемая задача"
            value={getTaskType(dataset)}
          />
          <InfoItem
            label="Общее количество нейронов"
            value={architecture.reduce((sum, layer) => sum + layer.neurons, 0).toLocaleString()}
          />
          <InfoItem
            label="Сложность модели"
            value={getComplexity(architecture)}
            color={getComplexityColor(architecture)}
          />
          <InfoItem
            label="Скрытых слоёв"
            value={(architecture.filter(l => l.type === 'hidden').length).toString()}
          />
          <InfoItem
            label="Функции активации"
            value={[...new Set(architecture.map(l => l.activation))].join(', ')}
          />
        </div>
      </div>

      {/* Recommendations */}
      <div style={styles.recommendations}>
        <h3 style={{ color: '#e8e8e8', margin: '0 0 12px', fontSize: 16 }}>
          💡 Рекомендации
        </h3>
        <ul style={{ color: '#8888aa', fontSize: 13, margin: 0, paddingLeft: 20 }}>
          {getRecommendations(dataset, architecture).map((rec, index) => (
            <li key={index} style={{ marginBottom: 6 }}>{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// ============================================================================
// Helpers
// ============================================================================

function generateArchitecture(dataset: DatasetFile): LayerInfo[] {
  const layers: LayerInfo[] = [];
  const columnCount = dataset.columnCount || 10;

  // Input layer
  layers.push({
    type: 'input',
    name: 'Input',
    neurons: columnCount,
    color: '#ef4444',
    activation: 'linear',
  });

  // Hidden layers
  const hiddenSize1 = Math.max(64, Math.min(256, Math.floor(columnCount * 1.5)));
  layers.push({
    type: 'hidden',
    name: 'Hidden 1',
    neurons: hiddenSize1,
    color: '#10b981',
    activation: 'relu',
  });

  if (dataset.rowCount && dataset.rowCount > 1000) {
    const hiddenSize2 = Math.max(32, Math.floor(columnCount * 0.8));
    layers.push({
      type: 'hidden',
      name: 'Hidden 2',
      neurons: hiddenSize2,
      color: '#3b82f6',
      activation: 'relu',
    });
  }

  // Output layer
  const taskType = getTaskType(dataset);
  let outputNeurons = 1;
  let outputActivation = 'linear';

  if (taskType.includes('Классификация')) {
    const uniqueClasses = Math.max(2, Math.floor(columnCount / 2));
    outputNeurons = uniqueClasses;
    outputActivation = 'softmax';
  } else if (taskType.includes('Временной ряд')) {
    outputNeurons = 1;
    outputActivation = 'linear';
  } else if (taskType.includes('CV')) {
    outputNeurons = 10;
    outputActivation = 'softmax';
  }

  layers.push({
    type: 'output',
    name: taskType.split('(')[0].trim(),
    neurons: outputNeurons,
    color: '#9d8fff',
    activation: outputActivation,
  });

  return layers;
}

function getTaskType(dataset: DatasetFile): string {
  switch (dataset.format) {
    case 'csv':
      return 'Регрессия/Классификация';
    case 'json':
      return 'Классификация';
    case 'parquet':
      return 'Временной ряд';
    case 'tfrecord':
      return 'Deep Learning';
    case 'image':
      return 'Computer Vision (CV)';
    case 'npy':
      return 'Custom';
    default:
      return 'Регрессия';
  }
}

function getComplexity(layers: LayerInfo[]): string {
  const hiddenCount = layers.filter(l => l.type === 'hidden').length;
  if (hiddenCount === 0) return 'Низкая';
  if (hiddenCount === 1) return 'Средняя';
  if (hiddenCount === 2) return 'Высокая';
  return 'Очень высокая';
}

function getComplexityColor(layers: LayerInfo[]): string {
  const complexity = getComplexity(layers);
  switch (complexity) {
    case 'Низкая': return '#4caf50';
    case 'Средняя': return '#ff9800';
    case 'Высокая': return '#f44336';
    default: return '#9d8fff';
  }
}

function getRecommendations(dataset: DatasetFile, architecture: LayerInfo[]): string[] {
  const recs: string[] = [];
  const hiddenCount = architecture.filter(l => l.type === 'hidden').length;

  if (dataset.rowCount && dataset.rowCount < 1000) {
    recs.push('Маленький датасет: рассмотрите использование простой модели для избежания переобучения');
  }

  if (hiddenCount > 2) {
    recs.push('Много скрытых слоёв: добавьте Dropout слои для регуляризации');
  }

  if (dataset.statistics?.missingValues && dataset.statistics.missingValues > 0) {
    recs.push('Обнаружены пропущенные значения: обработайте их перед обучением');
  }

  recs.push('Используйте валидационный набор для контроля качества обучения');
  recs.push('Примените нормализацию данных для ускорения сходимости');

  return recs;
}

// ============================================================================
// Sub-components
// ============================================================================

function InfoItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={styles.infoItem}>
      <div style={styles.infoLabel}>{label}</div>
      <div style={{ ...styles.infoValue, color: color || '#e8e8e8' }}>{value}</div>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    gap: 24,
    padding: 8,
  },
  diagramContainer: {
    background: '#1a1a2e',
    borderRadius: 12,
    border: '1px solid #2a2a3e',
    padding: 24,
  },
  layersRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap' as const,
  },
  layerWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
  },
  layerCard: {
    width: 120,
    padding: 16,
    background: '#0a0a0f',
    borderRadius: 12,
    textAlign: 'center' as const,
    transition: 'all 0.3s ease',
    cursor: 'default',
    border: '2px solid',
  },
  neuronBadge: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  layerTypeIcon: {
    marginBottom: 8,
  },
  layerName: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
  },
  layerActivation: {
    fontSize: 11,
    color: '#8888aa',
  },
  layerTypeLabel: {
    fontSize: 11,
    color: '#8888aa',
  },
  connectionLine: {
    width: 2,
    height: 60,
    background: 'linear-gradient(to bottom, #2a2a3e, #4a4a5e, #2a2a3e)',
    borderRadius: 1,
  },
  infoSection: {
    padding: 16,
    background: '#1a1a2e',
    borderRadius: 8,
    border: '1px solid #2a2a3e',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  infoItem: {
    padding: 12,
    background: '#0a0a0f',
    borderRadius: 6,
  },
  infoLabel: {
    color: '#8888aa',
    fontSize: 11,
    marginBottom: 4,
  },
  infoValue: {
    color: '#e8e8e8',
    fontSize: 14,
    fontWeight: 500,
  },
  recommendations: {
    padding: 16,
    background: '#1a1a2e',
    borderRadius: 8,
    border: '1px solid #2a2a3e',
  },
};
