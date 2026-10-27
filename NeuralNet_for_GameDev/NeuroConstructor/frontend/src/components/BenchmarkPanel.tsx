/**
 * BenchmarkPanel — UI для запуска и просмотра LM Benchmark

 * Сценарий:
 * 1. Указать количество тестов (по категориям)
 * 2. Запустить benchmark → Teacher vs Student
 * 3. Посмотреть сравнение по метрикам (Cosine, BLEU, ROUGE-L, Token F1)
 * 4. Посмотреть worst cases и общий отчёт
 */

import React, { useState, useCallback } from 'react';
import { runBenchmark, compareBenchmarkAnswers, checkHealth } from '@/api.client';

interface BenchmarkPanelProps {
  isServerAvailable: boolean;
}

interface StyleType {
  [key: string]: React.CSSProperties;
}

export const BenchmarkPanel: React.FC<BenchmarkPanelProps> = ({
  isServerAvailable,
}) => {
  const [config, setConfig] = useState({
    qa_pairs: 5,
    chat_dialogs: 3,
    code_examples: 2,
    creative_tasks: 2,
    output_dir: 'benchmarks',
    // LLM Engine settings
    teacher_model: '',
    student_model: '',
    teacher_api_url: 'http://localhost:8000',
    student_api_url: 'http://localhost:8000',
  });

  const [teacherModels, setTeacherModels] = useState<any[]>([]);
  const [studentModels, setStudentModels] = useState<any[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [llmStatus, setLlmStatus] = useState<any>(null);

  // ===== Load LLM status =====
  const loadLlmStatus = useCallback(async () => {
    if (!isServerAvailable) return;

    try {
      const response = await fetch(`${config.teacher_api_url}/api/llm/status`);
      const data = await response.json();
      setLlmStatus(data);
    } catch (err: any) {
      console.error('Failed to load LLM status:', err);
    }
  }, [isServerAvailable, config.teacher_api_url]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  // ===== Load models list =====
  const loadModels = useCallback(async () => {
    if (!isServerAvailable) return;

    try {
      const [teacherRes, studentRes] = await Promise.all([
        fetch(`${config.teacher_api_url}/api/models/list?directory=teacher`),
        fetch(`${config.teacher_api_url}/api/models/list?directory=student`),
      ]);

      const teacherData = await teacherRes.json();
      const studentData = await studentRes.json();

      // Filter only GGUF files for student models (exclude placeholder files like weights.bin)
      const ggufFiles = (studentData.files || []).filter((f: any) =>
        f.filename.toLowerCase().endsWith('.gguf')
      );

      setTeacherModels(teacherData.files || []);
      setStudentModels(ggufFiles);
      setModelsLoaded(true);
    } catch (err: any) {
      console.error('Failed to load models:', err);
    }
  }, [isServerAvailable, config.teacher_api_url]);

  // ===== Load model into LLM Engine =====
  const handleLoadModel = useCallback(async (modelType: 'teacher' | 'student') => {
    if (!isServerAvailable) {
      setError('Сервер недоступен');
      return;
    }

    const modelName = modelType === 'teacher' ? config.teacher_model : config.student_model;
    if (!modelName) {
      setError(`Выберите ${modelType === 'teacher' ? 'Teacher' : 'Student'} модель`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${config.teacher_api_url}/api/llm/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_path: `${modelType}/${modelName}`,
          model_type: modelType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setLlmStatus((prev: any) => ({
          ...prev,
          model_loaded: true,
          model_path: data.model_path || prev?.model_path || '',
          model_size_gb: data.model_size_gb || prev?.model_size_gb || 0,
        }));
        setError('');
      } else {
        setError(data.error || `Failed to load ${modelType} model`);
      }
    } catch (err: any) {
      setError(`Ошибка загрузки модели: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [isServerAvailable, config.teacher_model, config.student_model, config.teacher_api_url]);

  // Load models on mount
  React.useEffect(() => {
    loadModels();
    loadLlmStatus();
  }, [loadModels, loadLlmStatus]);

  // ===== Run benchmark =====
  const handleRun = useCallback(async () => {
    if (!isServerAvailable) {
      setError('Сервер недоступен');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    const requestBody = {
      qa_pairs: config.qa_pairs,
      chat_dialogs: config.chat_dialogs,
      code_examples: config.code_examples,
      creative_tasks: config.creative_tasks,
      output_dir: config.output_dir,
      teacher_model: config.teacher_model,
      student_model: config.student_model,
    };

    try {
      const data = await runBenchmark(requestBody);

      if (data.status === 'error') {
        setError(data.error_message || 'Ошибка запуска benchmark');
        return;
      }

      setResult(data);
    } catch (err: any) {
      setError(`Ошибка: ${err.message || 'Не удалось connect к серверу'}`);
    } finally {
      setLoading(false);
    }
  }, [config, isServerAvailable]);

  // ===== Compare single pair =====
  const [compare, setCompare] = useState({ teacher: '', student: '' });
  const [compareResult, setCompareResult] = useState<any>(null);

  const handleCompare = useCallback(async () => {
    if (!compare.teacher || !compare.student) return;

    try {
      const data = await compareBenchmarkAnswers(compare.teacher, compare.student);
      setCompareResult(data);
    } catch (err: any) {
      setError(`Ошибка сравнения: ${err.message}`);
    }
  }, [compare]);

  // ===== Config change handler =====
  const handleChange = (key: string, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // ===== Styles =====
  const styles: StyleType = {
    container: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#0a0a0f',
      height: '100%',
    },
    header: {
      padding: '16px 20px',
      borderBottom: '1px solid #2a2a3e',
      background: '#0a0a0f',
    },
    title: {
      color: '#e8e8e8',
      margin: 0,
      fontSize: 20,
      fontWeight: 600,
    },
    subtitle: {
      color: '#8888aa',
      fontSize: 12,
      marginTop: 4,
    },
    content: {
      flex: 1,
      display: 'flex',
      overflow: 'hidden',
    },
    configPanel: {
      width: 320,
      padding: 20,
      borderRight: '1px solid #2a2a3e',
      overflow: 'auto',
    },
    resultPanel: {
      flex: 1,
      padding: 20,
      overflow: 'auto',
    },
    label: {
      color: '#8888aa',
      fontSize: 12,
      display: 'block',
      marginBottom: 4,
      marginTop: 12,
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      background: '#1a1a2e',
      border: '1px solid #2a2a3e',
      borderRadius: 6,
      color: '#e8e8e8',
      fontSize: 14,
      outline: 'none',
      boxSizing: 'border-box',
    },
    numberInput: {
      width: '100%',
      padding: '8px 12px',
      background: '#1a1a2e',
      border: '1px solid #2a2a3e',
      borderRadius: 6,
      color: '#e8e8e8',
      fontSize: 14,
      outline: 'none',
      boxSizing: 'border-box',
    },
    button: {
      width: '100%',
      padding: '12px 16px',
      background: '#7c6ff7',
      border: 'none',
      borderRadius: 6,
      color: 'white',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
      marginTop: 20,
    },
    buttonDisabled: {
      background: '#2a2a3e',
      color: '#666688',
      cursor: 'not-allowed',
    },
    section: {
      background: '#12121c',
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      color: '#c8c8d8',
      fontSize: 14,
      fontWeight: 600,
      marginBottom: 12,
    },
    metricRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px solid #1a1a2e',
    },
    metricLabel: {
      color: '#8888aa',
      fontSize: 13,
    },
    metricValue: {
      color: '#e8e8e8',
      fontSize: 13,
      fontWeight: 600,
    },
    passed: {
      color: '#4caf50',
    },
    failed: {
      color: '#f44336',
    },
    error: {
      color: '#f44336',
      padding: 20,
      textAlign: 'center',
    },
    empty: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#666688',
      fontSize: 14,
    },
    compareRow: {
      display: 'flex',
      gap: 8,
      marginBottom: 12,
    },
    compareButton: {
      padding: '8px 16px',
      background: '#7c6ff7',
      border: 'none',
      borderRadius: 6,
      color: 'white',
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
    },
    worstCase: {
      background: '#0a0a0f',
      borderRadius: 6,
      padding: 12,
      marginBottom: 8,
      borderLeft: '3px solid #f44336',
    },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Benchmark — Teacher vs Student</h1>
        <p style={styles.subtitle}>
          Stage 1: Generate tests → Run Teacher/Student → Compare → Fine-tune Student
        </p>
      </div>

      <div style={styles.content}>
        {/* LEFT: Configuration */}
        <div style={styles.configPanel}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>🤖 LLM Engine Status</div>
            
            {llmStatus ? (
              <>
                <div style={styles.metricRow}>
                  <span style={styles.metricLabel}>llama-cpp-python</span>
                  <span style={{
                    ...styles.metricValue,
                    color: llmStatus.llama_cpp_available ? '#4caf50' : '#f44336',
                  }}>
                    {llmStatus.llama_cpp_available ? '✅ Available' : '❌ Not installed'}
                  </span>
                </div>
                <div style={styles.metricRow}>
                  <span style={styles.metricLabel}>Backend status</span>
                  <span style={{
                    ...styles.metricValue,
                    color: llmStatus.backend_status === 'ready' ? '#4caf50' : '#f44336',
                  }}>
                    {llmStatus.backend_status}
                  </span>
                </div>
                <div style={styles.metricRow}>
                  <span style={styles.metricLabel}>Teacher model</span>
                  <span style={{
                    ...styles.metricValue,
                    color: llmStatus.model_loaded ? '#4caf50' : '#8888aa',
                  }}>
                    {llmStatus.model_loaded ? '✅ Loaded' : '○ Not loaded'}
                  </span>
                </div>
                {llmStatus.model_path && (
                  <div style={{ color: '#8888aa', fontSize: 11, marginTop: 4 }}>
                    {llmStatus.model_path}
                    <br />
                    Size: {llmStatus.model_size_gb} GB
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#666688', fontSize: 12 }}>Loading...</div>
            )}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>⚙️ Select Models</div>

            <label style={styles.label}>Teacher Model</label>
            <select
              value={config.teacher_model}
              onChange={(e) => setConfig(prev => ({ ...prev, teacher_model: e.target.value }))}
              style={{ ...styles.input, marginBottom: 8 }}
            >
              <option value="">[— Выбрать модель —]</option>
              {teacherModels.map((m: any) => (
                <option key={m.filename} value={m.filename}>{m.filename}</option>
              ))}
            </select>

            <button
              onClick={() => handleLoadModel('teacher')}
              disabled={!config.teacher_model || loading || !isServerAvailable}
              style={{
                ...styles.button,
                marginTop: 4,
                padding: '6px 12px',
                fontSize: 12,
                width: 'auto',
                opacity: (!config.teacher_model || loading || !isServerAvailable) ? 0.5 : 1,
              }}
            >
              {loading ? '⏳ Загрузка...' : '🔄 Загрузить в LLM Движок'}
            </button>

            <label style={{ ...styles.label, marginTop: 16 }}>Student Model</label>
            <select
              value={config.student_model}
              onChange={(e) => setConfig(prev => ({ ...prev, student_model: e.target.value }))}
              style={{ ...styles.input, marginBottom: 8 }}
            >
              <option value="">[— Выбрать модель —]</option>
              {studentModels.map((m: any) => (
                <option key={m.filename} value={m.filename}>{m.filename}</option>
              ))}
            </select>

            <button
              onClick={() => handleLoadModel('student')}
              disabled={!config.student_model || loading || !isServerAvailable}
              style={{
                ...styles.button,
                marginTop: 4,
                padding: '6px 12px',
                fontSize: 12,
                width: 'auto',
                opacity: (!config.student_model || loading || !isServerAvailable) ? 0.5 : 1,
              }}
            >
              {loading ? '⏳ Загрузка...' : '🔄 Загрузить в LLM Движок'}
            </button>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>⚙️ Parameters</div>

            <label style={styles.label}>QA пары</label>
            <input
              type="number"
              value={config.qa_pairs}
              onChange={(e) => handleChange('qa_pairs', Math.max(1, +e.target.value))}
              style={styles.numberInput}
              min={1}
              max={100}
            />

            <label style={styles.label}>Чат диалоги</label>
            <input
              type="number"
              value={config.chat_dialogs}
              onChange={(e) => handleChange('chat_dialogs', Math.max(1, +e.target.value))}
              style={styles.numberInput}
              min={1}
              max={100}
            />

            <label style={styles.label}>Код примеры</label>
            <input
              type="number"
              value={config.code_examples}
              onChange={(e) => handleChange('code_examples', Math.max(1, +e.target.value))}
              style={styles.numberInput}
              min={1}
              max={100}
            />

            <label style={styles.label}>Креатив задания</label>
            <input
              type="number"
              value={config.creative_tasks}
              onChange={(e) => handleChange('creative_tasks', Math.max(1, +e.target.value))}
              style={styles.numberInput}
              min={1}
              max={100}
            />

            <label style={styles.label}>Output dir</label>
            <input
              type="text"
              value={config.output_dir}
              onChange={(e) => setConfig(prev => ({ ...prev, output_dir: e.target.value }))}
              style={styles.input}
            />

            <button
              onClick={handleRun}
              disabled={loading || !isServerAvailable}
              style={{
                ...styles.button,
                ...(loading || !isServerAvailable ? styles.buttonDisabled : {}),
              }}
            >
              {loading ? '⏳ Запуск...' : '🚀 Запустить Тестирование'}
            </button>

            {!isServerAvailable && (
              <p style={{ color: '#f44336', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                Сервер не подключён
              </p>
            )}
          </div>

          {/* Manual compare */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>🔍 Ручное сравнение</div>

            <label style={styles.label}>Teacher ответ</label>
            <textarea
              value={compare.teacher}
              onChange={(e) => setCompare(prev => ({ ...prev, teacher: e.target.value }))}
              style={{ ...styles.input, height: 60, resize: 'vertical' }}
              placeholder="Ответ Teacher модели..."
            />

            <label style={styles.label}>Student ответ</label>
            <textarea
              value={compare.student}
              onChange={(e) => setCompare(prev => ({ ...prev, student: e.target.value }))}
              style={{ ...styles.input, height: 60, resize: 'vertical' }}
              placeholder="Ответ Student модели..."
            />

            <button
              onClick={handleCompare}
              disabled={!compare.teacher || !compare.student}
              style={{
                ...styles.compareButton,
                width: '100%',
                marginTop: 8,
                opacity: !compare.teacher || !compare.student ? 0.5 : 1,
              }}
            >
              Сравнить
            </button>
          </div>
        </div>

        {/* RIGHT: Results */}
        <div style={styles.resultPanel}>
          {error && (
            <div style={styles.error}>
              <p style={{ fontSize: 14 }}>⚠️ {error}</p>
            </div>
          )}

          {loading && !error && (
            <div style={styles.empty}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                <p>Запуск тестирования...</p>
              </div>
            </div>
          )}

          {result && !loading && (
            <div>
              {/* Summary card */}
              <div style={styles.section}>
                <div style={styles.sectionTitle}>📈 Сводка</div>

                <div style={styles.metricRow}>
                  <span style={styles.metricLabel}>Всего тестов</span>
                  <span style={styles.metricValue}>{result.total_tests}</span>
                </div>
                <div style={styles.metricRow}>
                  <span style={styles.metricLabel}>Пройдено</span>
                  <span style={{ ...styles.metricValue, ...styles.passed }}>
                    {result.passed} ({result.pass_rate}%)
                  </span>
                </div>
                <div style={styles.metricRow}>
                  <span style={styles.metricLabel}>Провалено</span>
                  <span style={{ ...styles.metricValue, ...styles.failed }}>
                    {result.failed}
                  </span>
                </div>
                <div style={styles.metricRow}>
                  <span style={styles.metricLabel}>Общая схожесть</span>
                  <span style={{
                    ...styles.metricValue,
                    ...(result.overall_similarity >= 85 ? styles.passed : styles.failed),
                  }}>
                    {result.overall_similarity}%
                  </span>
                </div>
                <div style={styles.metricRow}>
                  <span style={styles.metricLabel}>Нужен Fine-tuning</span>
                  <span style={{
                    ...styles.metricValue,
                    ...(result.fine_tuning_needed ? styles.failed : styles.passed),
                  }}>
                    {result.fine_tuning_needed ? 'ДА' : 'НЕТ'}
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div style={styles.section}>
                <div style={styles.sectionTitle}>📊 Metrics</div>

                {(() => {
                  // Find the first result in the array
                  const firstResult = result.report?.individual_results?.[0];
                  if (!firstResult) return null;
                  return (
                    <>
                      <div style={styles.metricRow}>
                        <span style={styles.metricLabel}>Cosine similarity (char)</span>
                        <span style={styles.metricValue}>
                          {(firstResult.metrics?.cosine_similarity_char || 0) * 100}%
                        </span>
                      </div>
                      <div style={styles.metricRow}>
                        <span style={styles.metricLabel}>Cosine similarity (word)</span>
                        <span style={styles.metricValue}>
                          {(firstResult.metrics?.cosine_similarity_word || 0) * 100}%
                        </span>
                      </div>
                      <div style={styles.metricRow}>
                        <span style={styles.metricLabel}>BLEU score</span>
                        <span style={styles.metricValue}>
                          {(firstResult.metrics?.bleu_score || 0) * 100}%
                        </span>
                      </div>
                      <div style={styles.metricRow}>
                        <span style={styles.metricLabel}>ROUGE-L</span>
                        <span style={styles.metricValue}>
                          {(firstResult.metrics?.rouge_l || 0) * 100}%
                        </span>
                      </div>
                      <div style={styles.metricRow}>
                        <span style={styles.metricLabel}>Token F1</span>
                        <span style={styles.metricValue}>
                          {(firstResult.metrics?.token_f1 || 0) * 100}%
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Distribution */}
              <div style={styles.section}>
                <div style={styles.sectionTitle}>📊 Distribution</div>

                {(() => {
                  const dist = result.report?.distribution;
                  if (!dist) return null;
                  return (
                    <>
                      <div style={styles.metricRow}>
                        <span style={styles.metricLabel}>Excellent (≥95%)</span>
                        <span style={styles.metricValue}>{dist.excellent_95_100}</span>
                      </div>
                      <div style={styles.metricRow}>
                        <span style={styles.metricLabel}>Good (85-95%)</span>
                        <span style={styles.metricValue}>{dist.good_85_95}</span>
                      </div>
                      <div style={styles.metricRow}>
                        <span style={styles.metricLabel}>Mediocre (70-85%)</span>
                        <span style={styles.metricValue}>{dist.mediocre_70_85}</span>
                      </div>
                      <div style={styles.metricRow}>
                        <span style={styles.metricLabel}>Poor (&lt;70%)</span>
                        <span style={{ ...styles.metricValue, ...styles.failed }}>
                          {dist.poor_below_70}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Worst cases */}
              <div style={styles.section}>
                <div style={styles.sectionTitle}>⚠️ Worst cases (top 5)</div>
                {(() => {
                  const worst = result.report?.worst_cases?.slice(0, 5);
                  if (!worst || worst.length === 0) {
                    return <p style={{ color: '#666688', fontSize: 13 }}>Все тесты пройдены</p>;
                  }
                  return worst.map((case_: any, idx: number) => (
                    <div key={idx} style={styles.worstCase}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: '#c8c8d8', fontSize: 12 }}>{case_.test_id}</span>
                        <span style={{
                          color: case_.passed ? '#4caf50' : '#f44336',
                          fontSize: 12,
                          fontWeight: 600,
                        }}>
                          {case_.overall_score * 100}%
                        </span>
                      </div>
                      <div style={{ color: '#8888aa', fontSize: 12 }}>
                        Q: {case_.question}
                      </div>
                      <div style={{ color: '#666688', fontSize: 11, marginTop: 4 }}>
                        T: {case_.teacher_answer}
                      </div>
                      <div style={{ color: '#666688', fontSize: 11, marginTop: 2 }}>
                        S: {case_.student_answer}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {compareResult && !loading && !error && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>🔍 Сравнение</div>

              <div style={styles.metricRow}>
                <span style={styles.metricLabel}>Passed (≥85%)</span>
                <span style={{
                  ...styles.metricValue,
                  ...(compareResult.passed ? styles.passed : styles.failed),
                }}>
                  {compareResult.passed ? 'YES' : 'NO'}
                </span>
              </div>
              <div style={styles.metricRow}>
                <span style={styles.metricLabel}>Overall score</span>
                <span style={{
                  ...styles.metricValue,
                  ...(compareResult.overall_score >= 0.85 ? styles.passed : styles.failed),
                }}>
                  {compareResult.overall_score * 100}%
                </span>
              </div>
              <div style={styles.metricRow}>
                <span style={styles.metricLabel}>Cosine char</span>
                <span style={styles.metricValue}>
                  {(compareResult.metrics?.cosine_similarity_char || 0) * 100}%
                </span>
              </div>
              <div style={styles.metricRow}>
                <span style={styles.metricLabel}>BLEU</span>
                <span style={styles.metricValue}>
                  {(compareResult.metrics?.bleu_score || 0) * 100}%
                </span>
              </div>
              <div style={styles.metricRow}>
                <span style={styles.metricLabel}>ROUGE-L</span>
                <span style={styles.metricValue}>
                  {(compareResult.metrics?.rouge_l || 0) * 100}%
                </span>
              </div>
              <div style={styles.metricRow}>
                <span style={styles.metricLabel}>Token F1</span>
                <span style={styles.metricValue}>
                  {(compareResult.metrics?.token_f1 || 0) * 100}%
                </span>
              </div>
            </div>
          )}

          {!result && !loading && !error && !compareResult && (
            <div style={styles.empty}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                <p>Настройте параметры слева и нажмите "Run Benchmark"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
