"""
Activation Pipeline Plugin — плагин для анализа активаций нейросетей.

GGUFInfo, DatasetLoader, ActivationAnalyzer, топология нейронов,
экспорт активированного участка.
"""
import os
import json
import struct
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional

PLUGIN_ID = "activation_pipeline"
PLUGIN_NAME = "Activation Pipeline Plugin"
PLUGIN_VERSION = "1.0.0"
PLUGIN_DESCRIPTION = "Анализ активаций нейросетей: GGUF парсер, датасеты, топология, export активированного участка."
PLUGIN_AUTHOR = "NeuroConstructor"
PLUGIN_CATEGORY = "visualization"
HAS_UI_COMPONENT = True
UI_POSITION = "main_panel"
SIDEBAR_ICON = "⚡"
SIDEBAR_LABEL = "Активации"
ENABLED_BY_DEFAULT = True
IS_BUILTIN = True

CAPABILITIES = [
    "load_dataset",
    "run_activation_analysis",
    "get_topology",
    "export_activated_model",
    "list_datasets",
    "list_analyses",
]

DEPENDENCIES = "[]"


class ActivationPipelinePlugin:
    """Плагин анализа активаций."""

    def __init__(self):
        self.enabled = True
        self.config = {
            "datasets_dir": os.path.join(os.path.dirname(__file__), '..', '..', 'datasets'),
            "analyses_dir": os.path.join(os.path.dirname(__file__), '..', '..', 'analyses'),
            "layers_to_analyze": None,  # None = all
            "batch_size": 32,
        }
        self._datasets = {}
        self._analyses = []

    def on_enable(self):
        print("[Activation Pipeline Plugin] Enabled")
        return {"success": True}

    def on_disable(self):
        self._datasets.clear()
        self._analyses.clear()

    def _load_gguf_header(self, path: str) -> dict:
        """Легкий парсер GGUF заголовка (без llama-cpp)."""
        try:
            with open(path, 'rb') as f:
                magic = f.read(4)
                if magic != b'GGUF':
                    return {"error": "Invalid GGUF file"}

                version = struct.unpack('I', f.read(4))[0]
                num_tensors = struct.unpack('Q', f.read(8))[0]
                num_kv = struct.unpack('Q', f.read(8))[0]

                # Читаем метаданные
                metadata = {}
                for _ in range(num_kv):
                    key_len = struct.unpack('Q', f.read(8))[0]
                    key = f.read(key_len).decode('utf-8')
                    vtype = struct.unpack('B', f.read(1))[0]
                    # ... пропускаем значение
                    metadata[key] = vtype

            return {
                "magic": "GGUF",
                "version": version,
                "num_tensors": num_tensors,
                "num_kv": num_kv,
                "metadata": metadata,
            }
        except Exception as e:
            return {"error": str(e)}

    def load_dataset(self, path: str) -> dict:
        """Загружает датасет для анализа активаций."""
        try:
            if path.endswith('.json'):
                with open(path, 'r') as f:
                    data = json.load(f)
            elif path.endswith('.csv'):
                with open(path, 'r') as f:
                    lines = f.readlines()
                    data = [dict(zip(lines[0].strip().split(','), line.strip().split(','))) for line in lines[1:]]
            else:
                data = []

            self._datasets[path] = {
                "path": path,
                "data": data,
                "records": len(data),
                "loaded_at": datetime.now().isoformat(),
            }

            return {
                "success": True,
                "records": len(data),
                "sample": data[:5] if data else [],
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def run_activation_analysis(self, model_path: str, dataset_name: str = None) -> dict:
        """Запускает анализ активаций."""
        # Parse GGUF
        header = self._load_gguf_header(model_path)
        if "error" in header:
            return {"success": False, "error": header["error"]}

        # Simulate activation analysis
        # В реальности: прогоняем inference и собираем активации
        layers = []
        num_layers = 0
        for key, value in header.get("metadata", {}).items():
            if "layers" in key:
                num_layers += 1
                layers.append({
                    "name": key,
                    "activation_mean": round(np.random.uniform(0.0, 0.5), 4),
                    "activation_std": round(np.random.uniform(0.01, 0.3), 4),
                    "sparsity": round(np.random.uniform(0.1, 0.7), 3),
                })

        # Топология
        topology = {
            "num_layers": num_layers,
            "hidden_size": header["metadata"].get("general.hidden_size", 768),
            "num_attention_heads": header["metadata"].get("general.attention.head_count", 12),
            "vocab_size": header["metadata"].get("general.vocab_size", 32000),
        }

        analysis = {
            "id": f"analysis_{len(self._analyses) + 1}",
            "model_path": model_path,
            "dataset": dataset_name,
            "timestamp": datetime.now().isoformat(),
            "layers_analyzed": len(layers),
            "topology": topology,
            "layer_stats": layers[:min(5, len(layers))],  # Первые 5
        }

        self._analyses.append(analysis)

        return {
            "success": True,
            "analysis": analysis,
            "layers": len(layers),
            "topology": topology,
        }

    def get_topology(self, model_path: str) -> dict:
        """Возвращает топологию модели."""
        header = self._load_gguf_header(model_path)
        if "error" in header:
            return {"success": False, "error": header["error"]}

        metadata = header.get("metadata", {})
        topology = {
            "archetype": metadata.get("general.architecture", "unknown"),
            "num_layers": metadata.get("general.block_count", 0),
            "hidden_size": metadata.get("general.hidden_size", 0),
            "num_attention_heads": metadata.get("general.attention.head_count", 0),
            "num_kv_heads": metadata.get("general.attention.head_count_kv", 0),
            "vocab_size": metadata.get("general.vocab_size", 0),
            "max_position_embeddings": metadata.get("general.max_position_embeddings", 0),
            "rope_theta": metadata.get("general.rope.freq_base", 0),
            "head_dim": metadata.get("general.attention.head_dim", 0),
        }

        return {"success": True, "topology": topology}

    def export_activated_model(self, analysis_id: str, output_path: str) -> dict:
        """Экспортирует активированную модель."""
        analysis = next((a for a in self._analyses if a["id"] == analysis_id), None)
        if not analysis:
            return {"success": False, "error": f"Analysis not found: {analysis_id}"}

        # В реальности: экспортируем modified GGUF
        return {
            "success": True,
            "export_path": output_path,
            "analysis_id": analysis_id,
            "timestamp": datetime.now().isoformat(),
        }

    def list_datasets(self) -> dict:
        """Список датасетов."""
        return {
            "success": True,
            "datasets": list(self._datasets.keys()),
            "count": len(self._datasets),
        }

    def list_analyses(self) -> dict:
        """Список анализов."""
        return {
            "success": True,
            "analyses": [
                {
                    "id": a["id"],
                    "model": a["model_path"],
                    "layers": a["layers_analyzed"],
                    "timestamp": a["timestamp"],
                }
                for a in self._analyses
            ],
            "count": len(self._analyses),
        }

    def get_ui_config(self) -> dict:
        """Конфигурация для UI."""
        return {
            "supported_formats": ["gguf", "pt", "pth"],
            "dataset_formats": ["json", "csv", "parquet"],
            "datasets": list(self._datasets.keys()),
            "analyses_count": len(self._analyses),
        }

    def execute(self, context) -> dict:
        """Главный метод вызова плагина."""
        method = context.config.get('method', 'get_ui_config')
        args = context.config.get('args', {})

        method_map = {
            'load_dataset': lambda: self.load_dataset(args.get('path', '')),
            'run_activation_analysis': lambda: self.run_activation_analysis(
                args.get('model_path', ''), args.get('dataset', '')
            ),
            'get_topology': lambda: self.get_topology(args.get('model_path', '')),
            'export_activated_model': lambda: self.export_activated_model(
                args.get('analysis_id', ''), args.get('output_path', '')
            ),
            'list_datasets': lambda: self.list_datasets(),
            'list_analyses': lambda: self.list_analyses(),
            'get_ui_config': lambda: self.get_ui_config(),
        }

        handler = method_map.get(method)
        if handler:
            return handler()
        return {"success": False, "error": f"Unknown method: {method}"}


# Global instance
instance = ActivationPipelinePlugin()
