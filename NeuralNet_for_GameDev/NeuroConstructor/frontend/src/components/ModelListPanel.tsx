/**
 * ModelListPanel — компонент списка файлов Teacher/Student
 * Отвечает за отображение и выбор файлов в левой панели
 */

import React from 'react';
import { ModelFile } from '@/types';
import { formatSize } from './files-manager';

// ============================================================================
// Типы
// ============================================================================

interface ModelListPanelProps {
  teacherFiles: ModelFile[];
  studentFiles: ModelFile[];
  selectedFile: ModelFile | null;
  onSelectFile: (file: ModelFile) => void;
}

// ============================================================================
// Компонент карточки файла
// ============================================================================

interface FileCardProps {
  file: ModelFile;
  isSelected: boolean;
  icon: string;
  onClick: (file: ModelFile) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, isSelected, icon, onClick }) => (
  <div
    onClick={() => onClick(file)}
    style={{
      padding: '10px 12px',
      background: isSelected ? 'rgba(124, 111, 247, 0.15)' : 'transparent',
      border: '1px solid transparent',
      borderRadius: 8,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }}
    onMouseEnter={e => {
      if (!isSelected) {
        (e.currentTarget as HTMLDivElement).style.background = '#1a1a2e';
      }
    }}
    onMouseLeave={e => {
      if (!isSelected) {
        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }
    }}
  >
    <div style={{
      fontSize: 13,
      fontWeight: 500,
      color: '#e8e8e8',
      marginBottom: 4,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}>
      {icon} {file.filename}
    </div>
    <div style={{ fontSize: 11, color: '#8888aa' }}>
      {formatSize(file.size)}
    </div>
  </div>
);

// ============================================================================
// Основной компонент
// ============================================================================

/**
 * Панель со списком моделей Teacher и Student.
 * Отображается в левой части ModelsPanel.
 */
const ModelListPanel: React.FC<ModelListPanelProps> = ({
  teacherFiles,
  studentFiles,
  selectedFile,
  onSelectFile,
}) => {
  const sectionStyle: React.CSSProperties = {
    marginBottom: 24,
  };

  const headingStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: '#8888aa',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 8,
    padding: '0 8px',
  };

  const noModelsStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#555577',
    padding: '8px',
    fontStyle: 'italic',
  };

  return (
    <div style={{ width: 280, borderRight: '1px solid #1e1e30', overflowY: 'auto', padding: '12px' }}>
      {/* Teacher Models */}
      <div style={sectionStyle}>
        <h3 style={headingStyle}>
          Teacher ({teacherFiles.length})
        </h3>
        {teacherFiles.length === 0 ? (
          <p style={noModelsStyle}>Нет моделей</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {teacherFiles.map((file, index) => (
              <FileCard
                key={index}
                file={file}
                isSelected={selectedFile === file}
                icon="📦"
                onClick={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>

      {/* Student Models */}
      <div>
        <h3 style={headingStyle}>
          Student ({studentFiles.length})
        </h3>
        {studentFiles.length === 0 ? (
          <p style={noModelsStyle}>Нет моделей</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {studentFiles.map((file, index) => (
              <FileCard
                key={index}
                file={file}
                isSelected={selectedFile === file}
                icon="🎓"
                onClick={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelListPanel;
