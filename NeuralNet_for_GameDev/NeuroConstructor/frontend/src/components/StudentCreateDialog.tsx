/**
 * StudentCreateDialog — диалог создания Student модели с нуля
 * Содержит форму с параметрами архитектуры (скрытый слой, количество heads и т.д.)
 */

import React from 'react';

// ============================================================================
// Типы
// ============================================================================

export interface StudentArchitecture {
  model_family: string;
  hidden_size: number;
  num_layers: number;
  num_heads: number;
  vocab_size: number;
  max_position_embeddings: number;
}

interface StudentCreateDialogProps {
  studentArch: StudentArchitecture;
  loading: boolean;
  onArchChange: (arch: StudentArchitecture) => void;
  onCreate: () => void;
  onCancel: () => void;
}

// ============================================================================
// Стили
// ============================================================================

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  background: '#121220',
  borderRadius: 12,
  padding: 24,
  width: 500,
  maxWidth: '90%',
  border: '1px solid #1e1e30',
};

const h3Style: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: '#e8e8e8',
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#8888aa',
  display: 'block',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#0a0a0f',
  border: '1px solid #1e1e30',
  borderRadius: 8,
  color: '#e8e8e8',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
};

const optionStyle: React.CSSProperties = {
  background: '#0a0a0f',
  color: '#e8e8e8',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
};

const buttonContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
};

const cancelButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: '#1a1a2e',
  border: '1px solid #2a2a3e',
  borderRadius: 8,
  color: '#8888aa',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
};

// ============================================================================
// Компонент
// ============================================================================

/**
 * Диалог создания Student модели с нуля.
 * Отображается как модальное окно с формой параметров архитектуры.
 */
const StudentCreateDialog: React.FC<StudentCreateDialogProps> = ({
  studentArch,
  loading,
  onArchChange,
  onCreate,
  onCancel,
}) => {
  const handleChange = (field: keyof StudentArchitecture, value: string | number) => {
    onArchChange({ ...studentArch, [field]: value });
  };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={dialogStyle} onClick={e => e.stopPropagation()}>
        <h3 style={h3Style}>Создать Student модель с нуля</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {/* Выбор архитектуры */}
          <div>
            <label style={labelStyle}>Architecture</label>
            <select
              value={studentArch.model_family}
              onChange={e => handleChange('model_family', e.target.value)}
              style={selectStyle}
            >
              <option value="bert" style={optionStyle}>BERT</option>
              <option value="llama" style={optionStyle}>LLaMA</option>
              <option value="gpt2" style={optionStyle}>GPT-2</option>
            </select>
          </div>

          {/* Параметры в сетке */}
          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>Layers</label>
              <input
                type="number"
                value={studentArch.num_layers}
                onChange={e => handleChange('num_layers', parseInt(e.target.value) || 12)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Hidden Size</label>
              <input
                type="number"
                value={studentArch.hidden_size}
                onChange={e => handleChange('hidden_size', parseInt(e.target.value) || 768)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Heads</label>
              <input
                type="number"
                value={studentArch.num_heads}
                onChange={e => handleChange('num_heads', parseInt(e.target.value) || 12)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Vocab Size</label>
              <input
                type="number"
                value={studentArch.vocab_size}
                onChange={e => handleChange('vocab_size', parseInt(e.target.value) || 30522)}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div style={buttonContainerStyle}>
          <button onClick={onCancel} disabled={loading} style={cancelButtonStyle}>
            Отмена
          </button>
          <button
            onClick={onCreate}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: '#4caf50',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {loading ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentCreateDialog;
