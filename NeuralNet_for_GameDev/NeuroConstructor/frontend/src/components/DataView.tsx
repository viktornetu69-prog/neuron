/**
 * DataView — компонент предварительного просмотра данных датасета
 * Отображает строки и столбцы в виде таблицы с подсветкой строк
 */

import React, { useState } from 'react';
import { DatasetFile } from '@/types/dataset-panel.types';

interface DataViewProps {
  dataset: DatasetFile;
}

export const DataView: React.FC<DataViewProps> = ({ dataset }) => {
  const [selectedRow, setSelectedRow] = useState<number | null>(0);

  if (!dataset.preview || dataset.preview.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <p style={{ color: '#666688', margin: 0 }}>Нет предварительного просмотра данных</p>
      </div>
    );
  }

  const sampleData = dataset.preview.slice(0, 10);
  const columns = Object.keys(sampleData[0]);

  const formatCellValue = (value: string | number | boolean | null | object): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') {
      return JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '');
    }
    return String(value);
  };

  const getCellAlignment = (value: string | number | boolean | null | object): React.CSSProperties['textAlign'] => {
    if (typeof value === 'number') return 'right';
    return 'left';
  };

  return (
    <div style={styles.container}>
      {/* Data Grid */}
      <div style={styles.grid}>
        {/* Header */}
        <div style={styles.headerRow}>
          <div style={styles.indexCell}>#</div>
          {columns.map((column) => (
            <div
              key={column}
              style={styles.headerCell}
            >
              {column}
            </div>
          ))}
        </div>

        {/* Data Rows */}
        <div style={styles.rowsContainer}>
          {sampleData.map((row, rowIndex) => (
            <div
              key={rowIndex}
              onClick={() => setSelectedRow(rowIndex)}
              style={{
                ...styles.row,
                background: selectedRow === rowIndex ? 'rgba(124, 111, 247, 0.15)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (selectedRow !== rowIndex) {
                  (e.currentTarget as HTMLElement).style.background = '#1a1a2e';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedRow !== rowIndex) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <div style={{
                ...styles.indexCell,
                color: selectedRow === rowIndex ? '#7c6ff7' : '#8888aa',
              }}>
                {rowIndex + 1}
              </div>
              {columns.map((column) => (
                <div
                  key={column}
                  style={{
                    ...styles.cell,
                    textAlign: getCellAlignment(row[column]),
                  }}
                >
                  {formatCellValue(row[column])}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Data Summary */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>📊 Формат</div>
          <div style={styles.summaryValue}>{dataset.format.toUpperCase()}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>📏 Строк показано</div>
          <div style={styles.summaryValue}>
            {sampleData.length} из {dataset.rowCount?.toLocaleString() || 'N/A'}
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>📋 Столбцов</div>
          <div style={styles.summaryValue}>{columns.length}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>⭐ Качество</div>
          <div style={{
            ...styles.summaryValue,
            color: dataset.statistics?.qualityScore && dataset.statistics.qualityScore > 0.7
              ? '#4caf50'
              : dataset.statistics?.qualityScore && dataset.statistics.qualityScore > 0.4
              ? '#ff9800'
              : '#f44336',
          }}>
            {dataset.statistics?.qualityScore
              ? (dataset.statistics.qualityScore * 100).toFixed(0) + '%'
              : 'N/A'}
          </div>
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
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    gap: 20,
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    color: '#666688',
  },
  grid: {
    flex: 1,
    overflow: 'auto',
    border: '1px solid #2a2a3e',
    borderRadius: 8,
    background: '#0a0a0f',
  },
  headerRow: {
    display: 'grid',
    background: '#1a1a2e',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    padding: '12px 0',
  },
  headerCell: {
    padding: '12px 16px',
    color: '#8888aa',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'left' as const,
    borderBottom: '1px solid #2a2a3e',
  },
  indexCell: {
    padding: '12px 16px',
    color: '#8888aa',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'center' as const,
    minWidth: 40,
  },
  rowsContainer: {
    maxHeight: 400,
    overflow: 'auto',
  },
  row: {
    display: 'grid',
    padding: '0 0',
    borderBottom: '1px solid #1a1a2e',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  cell: {
    padding: '12px 16px',
    color: '#e8e8e8',
    fontSize: 12,
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
  },
  summaryCard: {
    padding: 16,
    background: '#1a1a2e',
    borderRadius: 8,
    border: '1px solid #2a2a3e',
  },
  summaryLabel: {
    color: '#8888aa',
    fontSize: 12,
    marginBottom: 8,
  },
  summaryValue: {
    color: '#e8e8e8',
    fontSize: 16,
    fontWeight: 500,
  },
};
