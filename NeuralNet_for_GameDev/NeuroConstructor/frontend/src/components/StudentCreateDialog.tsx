/**
 * StudentCreateDialog — диалог создания Student модели с нула или на основе Teacher
 * Содержит полную форму с параметрами архитектуры
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
  num_kv_heads: number;
  vocab_size: number;
  max_position_embeddings: number;
  rope_theta: number;
  head_dim: number;
}

interface StudentCreateDialogProps {
  studentArch: StudentArchitecture;
  teacherArch?: any;
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
  width: 600,
  maxWidth: '90%',
  maxHeight: '80vh',
  overflow: 'auto',
  border: '1px solid #1e1e30',
};

const h3Style: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: '#e8e8e8',
  marginBottom: 16,
};

const h4Style: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#8888aa',
  marginBottom: 12,
  marginTop: 16,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
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
  marginTop: 20,
  paddingTop: 16,
  borderTop: '1px solid #1a1a2e',
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
 * Диалог создания Student модели с нула или на основе Teacher.
 * Отображается как модальное окно с формой параметров архитектуры.
 */
const StudentCreateDialog: React.FC<StudentCreateDialogProps> = ({
  studentArch,
  teacherArch,
  loading,
  onArchChange,
  onCreate,
  onCancel,
}) => {
  const handleChange = (field: keyof StudentArchitecture, value: string | number) => {
    onArchChange({ ...studentArch, [field]: value });
  };

  // Предлагает выбрать модель из Teacher
  const handleApplyTeacher = () => {
    if (teacherArch) {
      onArchChange({
        model_family: teacherArch.model_family || studentArch.model_family,
        hidden_size: teacherArch.hidden_size || studentArch.hidden_size,
        num_layers: teacherArch.num_layers || studentArch.num_layers,
        num_heads: teacherArch.num_heads || studentArch.num_heads,
        num_kv_heads: teacherArch.num_kv_heads || studentArch.num_kv_heads,
        vocab_size: teacherArch.vocab_size || studentArch.vocab_size,
        max_position_embeddings: teacherArch.max_position_embeddings || studentArch.max_position_embeddings,
        rope_theta: teacherArch.rope_theta || studentArch.rope_theta,
        head_dim: teacherArch.head_dim || studentArch.head_dim,
      });
    }
  };

  // Доступные архитектуры
  const modelFamilies = [
    { value: 'qwen3', label: 'Qwen3' },
    { value: 'qwen2.5', label: 'Qwen 2.5' },
    { value: 'llama', label: 'LLaMA' },
    { value: 'gemma', label: 'Gemma' },
    { value: 'bert', label: 'BERT' },
    { value: 'gpt2', label: 'GPT-2' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'mixtral', label: 'Mixtral' },
  ];

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={dialogStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ ...h3Style, marginBottom: 0 }}>Создать Student модель</h3>
          {teacherArch && (
            <button
              onClick={handleApplyTeacher}
              style={{
                padding: '6px 12px',
                background: '#2a2a4e',
                border: '1px solid #3a3a5e',
                borderRadius: 6,
                color: '#8888aa',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              📋 Применить параметры Teacher
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
          {/* Архитектура */}
          <div>
            <h4 style={h4Style}>Архитектура</h4>
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Модель</label>
                <select
                  value={studentArch.model_family}
                  onChange={e => handleChange('model_family', e.target.value)}
                  style={selectStyle}
                >
                  {modelFamilies.map(f => (
                    <option key={f.value} value={f.value} style={optionStyle}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Размер словаря (Vocab)</label>
                <input
                  type="number"
                  value={studentArch.vocab_size}
                  onChange={e => handleChange('vocab_size', parseInt(e.target.value) || 32000)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Размеры */}
          <div>
            <h4 style={h4Style}>Размеры</h4>
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Скрытый размер (Hidden)</label>
                <input
                  type="number"
                  value={studentArch.hidden_size}
                  onChange={e => handleChange('hidden_size', parseInt(e.target.value) || 768)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Размер головки (Head Dim)</label>
                <input
                  type="number"
                  value={studentArch.head_dim}
                  onChange={e => handleChange('head_dim', parseInt(e.target.value) || 64)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Слой и внимание */}
          <div>
            <h4 style={h4Style}>Слой и внимание</h4>
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Слои (Layers)</label>
                <input
                  type="number"
                  value={studentArch.num_layers}
                  onChange={e => handleChange('num_layers', parseInt(e.target.value) || 12)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Головки внимания (Heads)</label>
                <input
                  type="number"
                  value={studentArch.num_heads}
                  onChange={e => handleChange('num_heads', parseInt(e.target.value) || 12)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>KV головки</label>
                <input
                  type="number"
                  value={studentArch.num_kv_heads}
                  onChange={e => handleChange('num_kv_heads', parseInt(e.target.value) || 12)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Контекст и Rope */}
          <div>
            <h4 style={h4Style}>Контекст и Rope</h4>
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Макс. контекст</label>
                <input
                  type="number"
                  value={studentArch.max_position_embeddings}
                  onChange={e => handleChange('max_position_embeddings', parseInt(e.target.value) || 2048)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Rope Theta</label>
                <input
                  type="number"
                  value={studentArch.rope_theta}
                  onChange={e => handleChange('rope_theta', parseInt(e.target.value) || 10000)}
                  style={inputStyle}
                />
              </div>
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
