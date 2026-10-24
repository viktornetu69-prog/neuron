import React, { useState, useEffect, useCallback, useRef } from 'react';
import { listTeacherFiles, listStudentFiles, uploadModel, convertModel, createStudentFromScratch, analyzeTeacherModel } from '@/api.client';
import { ModelFile } from '@/types';

export function ModelsPanel({ isServerAvailable }: { isServerAvailable: boolean }) {
  const [teacherFiles, setTeacherFiles] = useState<ModelFile[]>([]);
  const [studentFiles, setStudentFiles] = useState<ModelFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ModelFile | null>(null);
  const [teacherAnalysis, setTeacherAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showCreateStudentDialog, setShowCreateStudentDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [outputPath, setOutputPath] = useState('models/student/');
  const [studentArch, setStudentArch] = useState({
    model_family: 'bert',
    hidden_size: 768,
    num_layers: 12,
    num_heads: 12,
    vocab_size: 30522,
    max_position_embeddings: 512,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleString('ru-RU'); } catch { return dateStr; }
  };

  const formatParams = (params: number) => {
    if (params >= 1_000_000_000) return (params / 1_000_000_000).toFixed(1) + 'B';
    if (params >= 1_000_000) return (params / 1_000_000).toFixed(1) + 'M';
    return params.toString();
  };

  const loadFiles = useCallback(async () => {
    if (!isServerAvailable) return;
    try {
      const [teacherRes, studentRes] = await Promise.all([
        listTeacherFiles(),
        listStudentFiles(),
      ]);
      setTeacherFiles(teacherRes.models || []);
      setStudentFiles(studentRes.models || []);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load files: ${msg}`);
    }
  }, [isServerAvailable]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleFileSelect = async (file: ModelFile) => {
    setSelectedFile(file);
    setTeacherAnalysis(null);
    const isTeacher = file.path.includes('/teacher/') || file.path.includes('\\teacher\\');
    if (isTeacher) {
      try {
        const analysis = await analyzeTeacherModel(file.filename);
        setTeacherAnalysis(analysis);
      } catch (err: unknown) {
        console.error('Failed to analyze model:', err);
        setTeacherAnalysis({ status: 'error', error: 'Не удалось проанализировать модель' });
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const response = await uploadModel(file, 'teacher', (percent) => setUploadProgress(percent));
      if (response.status === 'success') {
        await loadFiles();
        setUploadProgress(100);
        setTimeout(() => { setUploadProgress(0); setIsUploading(false); }, 1500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to upload: ${msg}`);
      setIsUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConvert = async () => {
    if (!selectedFile || !outputPath.trim()) { setError('Output path is required'); return; }
    setLoading(true);
    try {
      const teacherPath = `models/teacher/${selectedFile.filename}`;
      await convertModel(teacherPath, outputPath);
      await loadFiles();
      setShowConvertDialog(false);
      setOutputPath('models/student/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to convert: ${msg}`);
    } finally { setLoading(false); }
  };

  const handleCreateStudent = async () => {
    setLoading(true);
    try {
      await createStudentFromScratch(studentArch);
      await loadFiles();
      setShowCreateStudentDialog(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create student: ${msg}`);
    } finally { setLoading(false); }
  };

  const openFilePicker = () => { fileInputRef.current?.click(); };

  // Описание параметров архитектуры
  const fieldDescriptions: Record<string, string> = {
    'Архитектура': 'Тип нейросети (BERT, LLaMA, Qwen3 и др.). Определяет общую структуру и механизм обработки данных.',
    'Размер словаря': 'Количество уникальных токенов (слов и подслов), которые модель может распознать. Чем больше — тем лучше охват языка, но выше требования к памяти.',
    'Размерность (Hidden)': 'Размерность скрытого представления каждого токена. Определяет способность модели кодировать семантику и сложные паттерны. Прямо влияет на количество параметров.',
    'Слои': 'Количество слоёв трансформера (encoder/decoder). Каждый слой извлекает более абстрактные признаки. Больше слоёв = лучше качество, но выше вычислительные затраты.',
    'Головки внимания': 'Количество head-ов в Multi-Head Attention. Позволяет модели одновременно фокусироваться на разных позициях и типах зависимостей в тексте.',
    'KV головки': 'Количество head-ов для key-value пар. Используется в Grouped Query Attention (GQA) для оптимизации памяти и скорости генерации.',
    'Размер головки': 'Размерность каждого attention head (вычисляется как Hidden Size / Heads). Определяет, сколько признаков может уловить один head за один проход.',
    'Макс. контекст': 'Максимальная длина последовательности токенов, которую модель может обработать за один раз. Определяет объём текста, который модель может прочитать сразу.',
    'RoPE Theta': 'Базовая частота в Rope Positional Embeddings. Определяет, как модель позиционирует токены в последовательности и влияет на способность обрабатывать контекст длиннее обученного.',
    'Оценка параметров': 'Общая оценка количества обучаемых параметров модели (в миллионах или миллиардах). Прямо связана с вычислительной мощностью модели.',
  };

  // Teacher architecture fields
  const archFields = teacherAnalysis?.architecture ? [
    { label: 'Архитектура', value: teacherAnalysis.architecture.model_family?.toUpperCase() },
    { label: 'Размер словаря', value: teacherAnalysis.architecture.vocab_size?.toLocaleString() || 'N/A' },
    { label: 'Размерность (Hidden)', value: teacherAnalysis.architecture.hidden_size?.toLocaleString() || 'N/A' },
    { label: 'Слои', value: teacherAnalysis.architecture.num_layers?.toString() || 'N/A' },
    { label: 'Головки внимания', value: teacherAnalysis.architecture.num_heads?.toString() || 'N/A' },
    { label: 'KV головки', value: teacherAnalysis.architecture.num_kv_heads?.toString() || 'N/A' },
    { label: 'Размер головки', value: teacherAnalysis.architecture.head_dim?.toString() || 'N/A' },
    { label: 'Макс. контекст', value: teacherAnalysis.architecture.max_position_embeddings?.toString() || 'N/A' },
    { label: 'RoPE Theta', value: teacherAnalysis.architecture.rope_theta?.toString() || 'N/A' },
    { label: 'Оценка параметров', value: teacherAnalysis.parameters?.estimated_total_params ? formatParams(teacherAnalysis.parameters.estimated_total_params) : 'N/A' },
  ] : [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0a0f' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #1e1e30', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#e8e8e8' }}>🧠 Модели</h2>
          <p style={{ fontSize: 12, color: '#8888aa', margin: 0 }}>{teacherFiles.length + studentFiles.length} моделей</p>
        </div>
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button onClick={openFilePicker} disabled={!isServerAvailable || loading} style={{ padding: '8px 16px', background: isServerAvailable ? '#7c6ff7' : '#1e1e30', border: 'none', borderRadius: 6, color: 'white', cursor: isServerAvailable ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
            <span>📁</span> Выбрать модель
          </button>
          <button onClick={() => setShowCreateStudentDialog(true)} disabled={!isServerAvailable || loading} style={{ padding: '8px 16px', background: isServerAvailable ? '#4caf50' : '#1e1e30', border: 'none', borderRadius: 6, color: 'white', cursor: isServerAvailable ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
            <span>+</span> Новый Student
          </button>
          <button onClick={() => setShowConvertDialog(true)} disabled={!selectedFile || !isServerAvailable || loading} style={{ padding: '8px 16px', background: selectedFile && isServerAvailable ? '#ff9800' : '#1e1e30', border: 'none', borderRadius: 6, color: 'white', cursor: selectedFile && isServerAvailable ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
            ⟳ Конвертировать
          </button>
        </div>
        {isUploading && (
          <div style={{ width: '100%', padding: '12px 0', background: '#121220', borderRadius: 8, border: '1px solid #2a2a3e' }}>
            <div style={{ width: '100%', height: 12, background: '#0a0a0f', borderRadius: 6, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #7c6ff7, #9d8fff)', borderRadius: 6, transition: 'width 0.2s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#8888aa' }}>
              <span>Загрузка модели...</span>
              <span style={{ fontWeight: 600, color: '#7c6ff7' }}>{uploadProgress}%</span>
            </div>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept=".gguf,.pt,.pth,.ckpt,.safetensors" style={{ display: 'none' }} onChange={handleFileChange} />

      {error && (
        <div style={{ padding: '12px 24px', background: 'rgba(244, 67, 54, 0.1)', borderLeft: '3px solid #f44336', margin: '16px 24px', borderRadius: '0 6px 6px 0', color: '#f44336', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left sidebar */}
        <div style={{ width: 280, borderRight: '1px solid #1e1e30', overflowY: 'auto', padding: '12px' }}>
          {/* Teacher Models */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, padding: '0 8px' }}>
              Teacher ({teacherFiles.length})
            </h3>
            {teacherFiles.length === 0 ? (
              <p style={{ fontSize: 12, color: '#555577', padding: '8px', fontStyle: 'italic' }}>Нет моделей</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {teacherFiles.map((file, index) => (
                  <div key={index} onClick={() => handleFileSelect(file)} style={{ padding: '10px 12px', background: selectedFile === file ? 'rgba(124, 111, 247, 0.15)' : 'transparent', border: '1px solid transparent', borderRadius: 8, cursor: 'pointer' }} onMouseEnter={e => { if (selectedFile !== file) (e.currentTarget as HTMLDivElement).style.background = '#1a1a2e'; }} onMouseLeave={e => { if (selectedFile !== file) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e8e8', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📦 {file.filename}</div>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>{formatSize(file.size)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Student Models */}
          <div>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, padding: '0 8px' }}>
              Student ({studentFiles.length})
            </h3>
            {studentFiles.length === 0 ? (
              <p style={{ fontSize: 12, color: '#555577', padding: '8px', fontStyle: 'italic' }}>Нет моделей</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {studentFiles.map((file, index) => (
                  <div key={index} onClick={() => handleFileSelect(file)} style={{ padding: '10px 12px', background: selectedFile === file ? 'rgba(76, 175, 80, 0.15)' : 'transparent', border: '1px solid transparent', borderRadius: 8, cursor: 'pointer' }} onMouseEnter={e => { if (selectedFile !== file) (e.currentTarget as HTMLDivElement).style.background = '#1a1a2e'; }} onMouseLeave={e => { if (selectedFile !== file) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e8e8', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎓 {file.filename}</div>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>{formatSize(file.size)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {!selectedFile ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8888aa' }}>
              <p style={{ fontSize: 14 }}>Выберите модель</p>
            </div>
          ) : (() => {
            const isTeacherFile = selectedFile.path.includes('/teacher/') || selectedFile.path.includes('\\teacher\\');
            
            if (isTeacherFile) {
              if (teacherAnalysis?.status === 'success') {
                return (
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e8e8e8', marginBottom: 16 }}>
                      📦 {teacherAnalysis.filename}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                      {archFields.map((field, index) => (
                        <div key={index} style={{ padding: 12, background: '#121220', borderRadius: 8, border: '1px solid #1e1e30' }} title={fieldDescriptions[field.label] || ''}>
                          <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{field.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8' }}>{field.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setShowConvertDialog(true)} disabled={!isServerAvailable || loading} style={{ padding: '10px 20px', background: isServerAvailable ? '#ff9800' : '#1e1e30', border: 'none', borderRadius: 8, color: 'white', cursor: isServerAvailable ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 500 }}>
                        ⟳ Конвертировать в Student
                      </button>
                      <button onClick={loadFiles} disabled={loading} style={{ padding: '10px 20px', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8, color: '#8888aa', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}>
                        ↻ Обновить
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8888aa' }}>
                  <p style={{ fontSize: 14, marginBottom: 8 }}>📦 {selectedFile.filename}</p>
                  <p style={{ fontSize: 13, color: '#f44336' }}>
                    {teacherAnalysis?.error || 'Анализ не доступен'}
                  </p>
                  <p style={{ fontSize: 12, color: '#666688', marginTop: 8 }}>
                    Размер: {formatSize(selectedFile.size)} • Изменён: {formatDate(selectedFile.modified)}
                  </p>
                </div>
              );
            }
            
            // Student file - basic view
            return (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e8e8e8', marginBottom: 16 }}>
                  🎓 {selectedFile.filename}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                  <div style={{ padding: 12, background: '#121220', borderRadius: 8, border: '1px solid #1e1e30' }}>
                    <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Размер</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8' }}>{formatSize(selectedFile.size)}</div>
                  </div>
                  <div style={{ padding: 12, background: '#121220', borderRadius: 8, border: '1px solid #1e1e30' }}>
                    <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Изменён</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e8e8e8' }}>{formatDate(selectedFile.modified)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={loadFiles} disabled={loading} style={{ padding: '10px 20px', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8, color: '#8888aa', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}>
                    ↻ Обновить
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Convert Dialog */}
      {showConvertDialog && selectedFile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#121220', borderRadius: 12, padding: 24, width: 500, maxWidth: '90%', border: '1px solid #1e1e30' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e8e8e8', marginBottom: 16 }}>Конвертировать в Student</h3>
            <div style={{ padding: 12, background: '#0a0a0f', borderRadius: 8, marginBottom: 16, color: '#8888aa', fontSize: 13 }}>
              Источник: <span style={{ color: '#e8e8e8' }}>{selectedFile.filename}</span>
            </div>
            <input type="text" value={outputPath} onChange={e => setOutputPath(e.target.value)} placeholder="Путь сохранения (например: models/student/my_model.gguf)" style={{ width: '100%', padding: '12px 16px', background: '#0a0a0f', border: '1px solid #1e1e30', borderRadius: 8, color: '#e8e8e8', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConvertDialog(false)} disabled={loading} style={{ padding: '10px 20px', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8, color: '#8888aa', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}>Отмена</button>
              <button onClick={handleConvert} disabled={loading || !outputPath.trim()} style={{ padding: '10px 20px', background: outputPath.trim() ? '#ff9800' : '#1e1e30', border: 'none', borderRadius: 8, color: 'white', cursor: outputPath.trim() && !loading ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 500 }}>
                {loading ? 'Конвертация...' : 'Конвертировать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Student Dialog */}
      {showCreateStudentDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#121220', borderRadius: 12, padding: 24, width: 500, maxWidth: '90%', border: '1px solid #1e1e30' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e8e8e8', marginBottom: 16 }}>Создать Student модель с нуля</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: '#8888aa', display: 'block', marginBottom: 4 }}>Architecture</label>
                <select value={studentArch.model_family} onChange={e => setStudentArch({ ...studentArch, model_family: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1e1e30', borderRadius: 8, color: '#e8e8e8', fontSize: 13 }}>
                  <option value="bert">BERT</option>
                  <option value="llama">LLaMA</option>
                  <option value="gpt2">GPT-2</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#8888aa', display: 'block', marginBottom: 4 }}>Layers</label>
                  <input type="number" value={studentArch.num_layers} onChange={e => setStudentArch({ ...studentArch, num_layers: parseInt(e.target.value) || 12 })} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1e1e30', borderRadius: 8, color: '#e8e8e8', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8888aa', display: 'block', marginBottom: 4 }}>Hidden Size</label>
                  <input type="number" value={studentArch.hidden_size} onChange={e => setStudentArch({ ...studentArch, hidden_size: parseInt(e.target.value) || 768 })} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1e1e30', borderRadius: 8, color: '#e8e8e8', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8888aa', display: 'block', marginBottom: 4 }}>Heads</label>
                  <input type="number" value={studentArch.num_heads} onChange={e => setStudentArch({ ...studentArch, num_heads: parseInt(e.target.value) || 12 })} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1e1e30', borderRadius: 8, color: '#e8e8e8', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8888aa', display: 'block', marginBottom: 4 }}>Vocab Size</label>
                  <input type="number" value={studentArch.vocab_size} onChange={e => setStudentArch({ ...studentArch, vocab_size: parseInt(e.target.value) || 30522 })} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1e1e30', borderRadius: 8, color: '#e8e8e8', fontSize: 13 }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreateStudentDialog(false)} disabled={loading} style={{ padding: '10px 20px', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8, color: '#8888aa', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}>Отмена</button>
              <button onClick={handleCreateStudent} disabled={loading} style={{ padding: '10px 20px', background: '#4caf50', border: 'none', borderRadius: 8, color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500 }}>
                {loading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
