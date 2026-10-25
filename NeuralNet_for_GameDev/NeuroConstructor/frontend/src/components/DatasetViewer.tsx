/**
 * DatasetViewer — компонент просмотра содержимого датасета
 *
 * Показывает таблицу с данными, фильтры и поиск
 */

import React, { useState, useMemo } from 'react';

export interface DatasetViewerProps {
  datasetId: string;
  isServerAvailable: boolean;
  onClose?: () => void;
}

export const DatasetViewer: React.FC<DatasetViewerProps> = ({
  datasetId,
  isServerAvailable,
  onClose,
}) => {
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(50);
  const [totalRows, setTotalRows] = useState(0);

  const loadRows = async () => {
    if (!isServerAvailable) {
      setError('Сервер недоступен');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/datasets/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: datasetId, limit }),
      });

      const data = await response.json();

      if (data.success) {
        setColumns(data.columns || []);
        setRows(data.rows || []);
        setTotalRows(data.total_rows || 0);
      } else {
        setError(data.error_message || 'Не удалось загрузить данные');
      }
    } catch (err: any) {
      setError(`Ошибка: ${err.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  React.useEffect(() => {
    loadRows();
  }, [datasetId, limit, isServerAvailable]);

  // Filter rows by search term
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;

    const term = searchTerm.toLowerCase();
    return rows.filter((row: any) =>
      Object.values(row).some((val: any) =>
        String(val || '').toLowerCase().includes(term)
      )
    );
  }, [rows, searchTerm]);

  if (!isServerAvailable) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔌</div>
          <h3 style={{ color: '#f44336', margin: '0 0 8px' }}>
            Сервер недоступен
          </h3>
          <p style={{ color: '#666688', fontSize: 14 }}>
            Запустите backend сервер для просмотра датасетов
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h3 style={{ color: '#e8e8e8', margin: '0 0 4px', fontSize: 16 }}>
            📊 Просмотр датасета: {datasetId}
          </h3>
          <p style={{ color: '#8888aa', margin: 0, fontSize: 12 }}>
            {totalRows} строк всего · {filteredRows.length} показано · {columns.length} столбцов
          </p>
        </div>

        <div style={styles.headerActions}>
          {/* Refresh */}
          <button onClick={loadRows} disabled={loading} style={styles.button}>
            {loading ? '⏳' : '🔄'} Обновить
          </button>

          {/* Limit selector */}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={styles.select}
          >
            <option value={10}>10 строк</option>
            <option value={50}>50 строк</option>
            <option value={100}>100 строк</option>
            <option value={500}>500 строк</option>
          </select>

          {/* Close */}
          {onClose && (
            <button onClick={onClose} style={{ ...styles.button, background: '#2a2a3e' }}>
              ✕ Закрыть
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="🔍 Поиск по всем полям..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={styles.clearButton}
          >
            Очистить
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorContainer}>
          <p style={{ color: '#f44336', margin: 0, fontSize: 13 }}>
            ⚠️ {error}
          </p>
          <button onClick={loadRows} style={styles.retryButton}>
            Попробовать снова
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner} />
          <p style={{ color: '#8888aa', marginTop: 16 }}>
            Загрузка данных...
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 50 }}>#</th>
                {columns.map((col) => (
                  <th key={col} style={styles.th}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} style={styles.td}>
                    {searchTerm ? 'Нет совпадений' : 'Нет данных'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row: any, idx: number) => (
                  <tr key={idx} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                    <td style={{ ...styles.td, color: '#666688' }}>{idx + 1}</td>
                    {columns.map((col) => (
                      <td key={col} style={styles.td}>
                        <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {String(row[col] ?? '')}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#0a0a0f',
    height: '100%',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #2a2a3e',
    background: '#0a0a0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    padding: '6px 12px',
    background: '#1a1a2e',
    border: '1px solid #2a2a3e',
    borderRadius: 6,
    color: '#8888aa',
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontWeight: 500,
  },
  select: {
    padding: '6px 10px',
    background: '#1a1a2e',
    border: '1px solid #2a2a3e',
    borderRadius: 6,
    color: '#8888aa',
    fontSize: 12,
    cursor: 'pointer',
  },
  searchBar: {
    padding: '8px 16px',
    borderBottom: '1px solid #2a2a3e',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    padding: '6px 12px',
    background: '#1a1a2e',
    border: '1px solid #2a2a3e',
    borderRadius: 6,
    color: '#e8e8e8',
    fontSize: 13,
    outline: 'none',
  },
  clearButton: {
    padding: '4px 10px',
    background: 'transparent',
    border: '1px solid #444466',
    borderRadius: 4,
    color: '#8888aa',
    fontSize: 11,
    cursor: 'pointer',
  },
  errorContainer: {
    padding: '8px 16px',
    background: '#1a0a0a',
    borderBottom: '1px solid #3a1a1a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  retryButton: {
    padding: '4px 10px',
    background: '#2a1a1a',
    border: '1px solid #4a2a2a',
    borderRadius: 4,
    color: '#f44336',
    fontSize: 11,
    cursor: 'pointer',
  },
  loadingOverlay: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0f',
  },
  spinner: {
    width: 30,
    height: 30,
    border: '3px solid #2a2a3e',
    borderTop: '3px solid #7c6ff7',
    borderRadius: '50%',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  tableContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '0 16px 16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    borderBottom: '2px solid #2a2a3e',
    color: '#8888aa',
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    position: 'sticky',
    top: 0,
    background: '#0a0a0f',
    zIndex: 1,
  },
  td: {
    padding: '8px 12px',
    borderBottom: '1px solid #1a1a2e',
    color: '#c8c8d8',
    fontSize: 12,
    maxWidth: 300,
  },
  trEven: {
    background: '#0f0f1a',
  },
  trOdd: {
    background: '#0a0a0f',
  },
};
