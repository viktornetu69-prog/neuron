/**
 * DatasetListPanel — компонент списка датасетов
 * Отвечает за отображение и выбор датасетов в левой панели
 */

import React, { useState } from 'react';
import { DatasetFile } from '@/types/dataset-panel.types';
import { DatasetCard } from './DatasetCard';

interface DatasetListPanelProps {
  datasets: DatasetFile[];
  selectedDataset: DatasetFile | null;
  onSelectDataset: (dataset: DatasetFile) => void;
  isServerAvailable: boolean;
  loading: boolean;
}

export const DatasetListPanel: React.FC<DatasetListPanelProps> = ({
  datasets,
  selectedDataset,
  onSelectDataset,
  isServerAvailable,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'training' | 'validation' | 'test'>('all');

  const filteredDatasets = datasets.filter(dataset => {
    const matchesSearch = dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dataset.path.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || dataset.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div style={styles.container}>
      {/* Search and Filters */}
      <div style={styles.header}>
        <input
          type="text"
          placeholder="Поиск датасетов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
          disabled={!isServerAvailable}
        />

        <div style={styles.filterRow}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            style={styles.filterSelect}
            disabled={!isServerAvailable}
          >
            <option value="all">Все типы</option>
            <option value="training">🎓 Тренировочные</option>
            <option value="validation">🔍 Валидационные</option>
            <option value="test">🧪 Тестовые</option>
          </select>

          <div style={styles.countBadge}>
            {filteredDatasets.length} {filteredDatasets.length === 1 ? 'шт' : 'шт'}
          </div>
        </div>
      </div>

      {/* Dataset List */}
      <div style={styles.listContainer}>
        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <p style={{ color: '#8888aa', marginTop: 12, fontSize: 13 }}>Загрузка датасетов...</p>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>
              {datasets.length === 0 ? '📁' : '🔍'}
            </div>
            <p style={{ color: '#666688', margin: 0, fontSize: 13, textAlign: 'center' }}>
              {datasets.length === 0 ? 'Нет загруженных датасетов' : 'Нет результатов поиска'}
            </p>
          </div>
        ) : (
          <div style={styles.list}>
            {filteredDatasets.map((dataset) => (
              <DatasetCard
                key={dataset.id}
                dataset={dataset}
                onClick={onSelectDataset}
                isSelected={selectedDataset?.id === dataset.id}
                isServerAvailable={isServerAvailable}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 320,
    minWidth: 280,
    display: 'flex',
    flexDirection: 'column',
    background: '#0a0a0f',
    borderRight: '1px solid #2a2a3e',
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    borderBottom: '1px solid #2a2a3e',
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px',
    background: '#1a1a2e',
    border: '1px solid #2a2a3e',
    borderRadius: 6,
    color: '#e8e8e8',
    fontSize: 13,
    outline: 'none',
    marginBottom: 12,
    boxSizing: 'border-box' as const,
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  filterSelect: {
    flex: 1,
    padding: '8px 10px',
    background: '#1a1a2e',
    border: '1px solid #2a2a3e',
    borderRadius: 6,
    color: '#e8e8e8',
    fontSize: 12,
    outline: 'none',
    cursor: 'pointer',
  },
  countBadge: {
    padding: '4px 8px',
    background: '#1a1a2e',
    borderRadius: 10,
    fontSize: 11,
    color: '#8888aa',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },
  listContainer: {
    flex: 1,
    overflow: 'auto',
    padding: 12,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  loadingState: {
    textAlign: 'center' as const,
    padding: 40,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 20px',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #2a2a3e',
    borderTop: '3px solid #7c6ff7',
    borderRadius: '50%',
    margin: '0 auto',
    animation: 'spin 1s linear infinite',
  },
};
