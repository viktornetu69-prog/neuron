/**
 * ChunkManager — система чанков для нейронной сети
 * 
 * Каждая структура данных представляет слой нейросети.
 * Каждый слой разбит на чанки (по 64 нейрона каждый).
 * 
 * Камера зумится и панорамируется. При приближении к краю чанка
 * загружается соседний. При отдалении — видны все чанки слоя.
 */

export interface NeuronInfo {
  index: number;
  weight?: number;
  bias?: number;
  activation?: number;
}

export interface ChunkData {
  layerIndex: number;
  chunkIndex: number;
  startNeuron: number;
  endNeuron: number;
  neurons: NeuronInfo[];
  incomingWeights?: Array<{ fromChunk: number; weights: number[] }>;
  outgoingWeights?: Array<{ toChunk: number; weights: number[] }>;
  realSize: number;
}

export interface ChunkManager {
  /** Получить чанк по индексу */
  getChunk(layerIndex: number, chunkIndex: number): ChunkData | null;
  /** Загрузить чанк */
  loadChunk(layerIndex: number, chunkIndex: number): ChunkData;
  /** Получить все чанки слоя */
  getChunksInLayer(layerIndex: number): number;
  /** Проверить если чанк загружен */
  isLoaded(layerIndex: number, chunkIndex: number): boolean;
  /** Очистить невидимые чанки */
  purgeInactive(): void;
  /** Получить все загруженные чанки */
  getActiveChunks(): ChunkData[];
  /** Получить информацию о слое */
  getLayerInfo(layerIndex: number): {
    name: string;
    realSize: number;
    chunkCount: number;
    color: string;
    colorLight: string;
  } | null;
  /** Все слои */
  getLayerCount(): number;
}

export function createChunkManager(
  layerConfigs: Array<{
    name: string;
    realSize: number;
    color: string;
    colorLight: string;
    colorDark: string;
  }>
): ChunkManager {
  const CHUNK_SIZE = 64;
  // Кэш загруженных чанков
  const chunkCache = new Map<string, ChunkData>();
  // Максимум загруженных чанков (для производительности)
  const MAX_CACHED = 200;

  const cacheKey = (li: number, ci: number) => `${li}-${ci}`;

  /** Генерация весов между двумя чанками */
  function generateWeights(fromStart: number, fromEnd: number, toStart: number, toEnd: number): number[] {
    const weights: number[] = [];
    // Генерируем представительные веса (не все связи, а выборка)
    const sampleSize = Math.min(32, (fromEnd - fromStart + 1) * (toEnd - toStart + 1));
    for (let i = 0; i < sampleSize; i++) {
      // Детерминированный "случайный" вес от -1 до 1
      const raw = Math.sin(fromStart * 9301 + toStart * 49297 + i * 2333) * 0.5;
      weights.push(Math.max(-1, Math.min(1, raw)));
    }
    return weights;
  }

  function loadChunk(layerIndex: number, chunkIndex: number): ChunkData {
    const key = cacheKey(layerIndex, chunkIndex);
    if (chunkCache.has(key)) return chunkCache.get(key)!;

    const layer = layerConfigs[layerIndex];
    if (!layer) throw new Error(`Layer ${layerIndex} not found`);

    const startNeuron = chunkIndex * CHUNK_SIZE;
    const endNeuron = Math.min(startNeuron + CHUNK_SIZE - 1, layer.realSize - 1);
    const neuronCount = endNeuron - startNeuron + 1;

    // Генерируем нейроны
    const neurons: NeuronInfo[] = [];
    for (let i = 0; i < neuronCount; i++) {
      const idx = startNeuron + i;
      neurons.push({
        index: idx,
        // Детерминированный "вес"
        weight: Math.max(-1, Math.min(1, Math.sin(idx * 127.1 + 311.7) * 0.8)),
        // Детерминированный "bias"
        bias: Math.max(-0.5, Math.min(0.5, Math.sin(idx * 269.5 + 183.3) * 0.3)),
        // Детерминированная "активация"
        activation: Math.max(0, Math.min(1, Math.sin(idx * 419.2 + 246.7) * 0.5 + 0.5)),
      });
    }

    // Входящие веса (с предыдущего чанка)
    const incomingWeights: Array<{ fromChunk: number; weights: number[] }> = [];
    if (layerIndex > 0 && chunkIndex > 0) {
      const prevLayer = layerConfigs[layerIndex - 1];
      if (prevLayer) {
        const prevChunkIndex = Math.floor((chunkIndex * CHUNK_SIZE) / CHUNK_SIZE) - 1;
        const weights = generateWeights(
          prevChunkIndex * CHUNK_SIZE,
          Math.min((prevChunkIndex + 1) * CHUNK_SIZE - 1, prevLayer.realSize - 1),
          startNeuron,
          endNeuron
        );
        incomingWeights.push({ fromChunk: prevChunkIndex, weights });
      }
    }

    // Исходящие веса (в следующий чанк)
    const outgoingWeights: Array<{ toChunk: number; weights: number[] }> = [];
    if (layerIndex < layerConfigs.length - 1 && chunkIndex < Math.ceil(layer.realSize / CHUNK_SIZE) - 1) {
      const nextChunkIndex = chunkIndex + 1;
      const weights = generateWeights(startNeuron, endNeuron, nextChunkIndex * CHUNK_SIZE, nextChunkIndex * CHUNK_SIZE + CHUNK_SIZE - 1);
      outgoingWeights.push({ toChunk: nextChunkIndex, weights });
    }

    const chunk: ChunkData = {
      layerIndex,
      chunkIndex,
      startNeuron,
      endNeuron,
      neurons,
      incomingWeights,
      outgoingWeights,
      realSize: layer.realSize,
    };

    // Ограничиваем кэш
    if (chunkCache.size >= MAX_CACHED) {
      // Удаляем первые загруженные чанки
      const firstKey = chunkCache.keys().next().value;
      if (firstKey) chunkCache.delete(firstKey);
    }

    chunkCache.set(key, chunk);
    return chunk;
  }

  function getChunk(layerIndex: number, chunkIndex: number): ChunkData | null {
    const key = cacheKey(layerIndex, chunkIndex);
    return chunkCache.has(key) ? chunkCache.get(key)! : null;
  }

  function getChunksInLayer(layerIndex: number): number {
    const layer = layerConfigs[layerIndex];
    return layer ? Math.ceil(layer.realSize / CHUNK_SIZE) : 0;
  }

  function isLoaded(layerIndex: number, chunkIndex: number): boolean {
    return chunkCache.has(cacheKey(layerIndex, chunkIndex));
  }

  function purgeInactive(): void {
    // Можно добавить логику очистки невидимых чанков
    // Пока не используем для простоты
  }

  function getActiveChunks(): ChunkData[] {
    return Array.from(chunkCache.values());
  }

  function getLayerInfo(layerIndex: number) {
    const layer = layerConfigs[layerIndex];
    if (!layer) return null;
    return {
      name: layer.name,
      realSize: layer.realSize,
      chunkCount: Math.ceil(layer.realSize / CHUNK_SIZE),
      color: layer.color,
      colorLight: layer.colorLight,
    };
  }

  return {
    getChunk,
    loadChunk,
    getChunksInLayer,
    isLoaded,
    purgeInactive,
    getActiveChunks,
    getLayerInfo,
    getLayerCount: () => layerConfigs.length,
  };
}
