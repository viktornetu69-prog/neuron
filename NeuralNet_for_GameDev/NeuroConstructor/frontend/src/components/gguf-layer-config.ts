/**
 * GGUF Layer Configuration — конфигурация слоёв для GGUF-специфичной визуализации
 * Определяет типы слоёв, цвета и специфичные элементы для каждой группы
 */

export type GGUFGroupType = 'input' | 'embedding' | 'hidden' | 'output';

export interface GGUFGroupConfig {
  type: GGUFGroupType;
  name: string;
  description: string;
  color: string;
  colorLight: string;
  colorDark: string;
  layerCount: number;
  visualElements: string[];
}

export const GGUF_GROUP_CONFIG: Record<GGUFGroupType, GGUFGroupConfig> = {
  input: {
    type: 'input',
    name: 'Input Layer',
    description: 'Входные данные — токенизация входного текста',
    color: '#ef4444',
    colorLight: '#fca5a5',
    colorDark: '#b91c1c',
    layerCount: 1,
    visualElements: ['tokenization', 'tokenizer'],
  },
  embedding: {
    type: 'embedding',
    name: 'Embedding Layer',
    description: 'Матрица эмбеддингов — WordPiece/BPE токенные представления',
    color: '#f97316',
    colorLight: '#fdba74',
    colorDark: '#c2410c',
    layerCount: 2, // Wte + Wpe
    visualElements: ['weight_matrix', 'positional_encoding'],
  },
  hidden: {
    type: 'hidden',
    name: 'Transformer Blocks',
    description: 'Multi-Head Attention + Feed-Forward Network',
    color: '#84cc16',
    colorLight: '#bef264',
    colorDark: '#4d7c0f',
    layerCount: 12, // Зависит от архитектуры
    visualElements: ['attention_heads', 'ffn_layers', 'layer_norm'],
  },
  output: {
    type: 'output',
    name: 'Output Layer',
    description: 'Language Model Head — projection to vocabulary',
    color: '#10b981',
    colorLight: '#6ee7b7',
    colorDark: '#047857',
    layerCount: 1,
    visualElements: ['lm_head', 'classification'],
  },
};

/**
 * Определяет тип GGUF группы для слоя
 */
export function determineGGUFGroupType(
  layerIndex: number,
  totalLayers: number,
  modelFamily?: string
): GGUFGroupType {
  // Для разных моделей разное распределение
  const isLLaMA = modelFamily === 'llama' || modelFamily === 'qwen';
  const isBERT = modelFamily === 'bert';
  const isGPT = modelFamily === 'gpt2';

  if (isLLaMA || isGPT) {
    // LLaMA/GPT: input → embedding → transformer blocks → output
    if (layerIndex === 0) return 'input';
    if (layerIndex === 1) return 'embedding';
    if (layerIndex === totalLayers - 1) return 'output';
    return 'hidden';
  }

  if (isBERT) {
    // BERT: embedding → transformer blocks → output
    if (layerIndex === 0 || layerIndex === 1 || layerIndex === 2) return 'embedding';
    if (layerIndex === totalLayers - 1) return 'output';
    return 'hidden';
  }

  // Default: input → transformer blocks → output
  if (layerIndex === 0) return 'input';
  if (layerIndex === totalLayers - 1) return 'output';
  return 'hidden';
}
