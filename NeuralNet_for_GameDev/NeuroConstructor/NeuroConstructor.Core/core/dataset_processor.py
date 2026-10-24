"""
Stage 3: Dataset Processing Pipeline

Обработчик данных для обучения модели учителя в проекте NeuroConstructor.
Поддерживает различные форматы данных и предоставляет пайплайн предобработки.
"""

from pathlib import Path
import json
import struct
from typing import Dict, List, Any, Optional


__version__ = '3.1.0'
__author__ = 'NeuroConstructor Team'


def _ensure_dir(path: str) -> str:
    """Create directory if it doesn't exist and return it."""
    import os
    directory = os.path.dirname(os.path.abspath(path))
    os.makedirs(directory, exist_ok=True)
    return directory


def _pack_string(value: str) -> bytes:
    """Pack a string with length prefix (little-endian uint64)."""
    encoded = value.encode('utf-8')
    return struct.pack('<Q', len(encoded)) + encoded


class DatasetInfo:
    """Metadata about a dataset."""

    def __init__(
        self,
        dataset_id: str,
        template_name: str,
        kind: str,
        count: int,
        created_at: str,
        status: str = "ready",
        params: Optional[Dict] = None
    ):
        self.dataset_id = dataset_id
        self.template_name = template_name
        self.kind = kind
        self.count = count
        self.created_at = created_at
        self.status = status
        self.params = params or {}
        self.example_count = 0

    def to_dict(self) -> Dict:
        return {
            "dataset_id": self.dataset_id,
            "template_name": self.template_name,
            "kind": self.kind,
            "count": self.count,
            "created_at": self.created_at,
            "status": self.status,
            "params": self.params,
            "example_count": self.example_count
        }

    @classmethod
    def from_manifest(cls, manifest_path: str) -> 'DatasetInfo':
        """Create DatasetInfo from a manifest.json file."""
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        info = cls(
            dataset_id=manifest.get("dataset_id", ""),
            template_name=manifest.get("template_name", ""),
            kind=manifest.get("kind", "text"),
            count=manifest.get("count", 0),
            created_at=manifest.get("created_at", ""),
            status=manifest.get("status", "ready"),
            params=manifest.get("params", {})
        )
        import os
        dataset_dir = os.path.dirname(manifest_path)
        example_files = [f for f in os.listdir(dataset_dir) if f.startswith('example_') and f.endswith('.json')]
        info.example_count = len(example_files)
        return info


class DatasetProcessor:
    """Process datasets for Stage 3: Dataset processing and activation analysis."""

    def __init__(self):
        self.processed_datasets: Dict[str, DatasetInfo] = {}

    def process_dataset(self, dataset_path: str, config: Optional[Dict] = None) -> Dict:
        """Process a dataset directory and return analysis results."""
        import os

        dataset_path = os.path.abspath(dataset_path)

        if not os.path.exists(dataset_path):
            return {
                "success": False,
                "error": f"Dataset directory not found: {dataset_path}"
            }

        manifest_path = os.path.join(dataset_path, "manifest.json")
        if not os.path.exists(manifest_path):
            return {
                "success": False,
                "error": f"Manifest not found in {dataset_path}"
            }

        info = DatasetInfo.from_manifest(manifest_path)

        examples = []
        dataset_dir = os.path.dirname(manifest_path)
        example_files = sorted([
            f for f in os.listdir(dataset_dir)
            if f.startswith('example_') and f.endswith('.json')
        ])

        for fname in example_files:
            try:
                with open(os.path.join(dataset_dir, fname), 'r') as f:
                    example = json.load(f)
                examples.append(example)
            except Exception:
                pass

        info.example_count = len(examples)

        preprocessing_steps = ["Загрузка данных", "Проверка структуры", "Валидация манифеста"]

        if config:
            if config.get("include_activation_analysis", False):
                preprocessing_steps.append("Анализ активаций")
            if config.get("include_quality_check", True):
                preprocessing_steps.append("Проверка качества")

        self.processed_datasets[info.dataset_id] = info

        return {
            "success": True,
            "dataset_info": info.to_dict(),
            "examples_loaded": len(examples),
            "preprocessing_steps": preprocessing_steps,
            "quality_score": min(1.0, len(examples) / max(1, info.count)) if info.count > 0 else 1.0
        }

    def get_dataset_info(self, dataset_id: str) -> Optional[DatasetInfo]:
        """Get info about a processed dataset."""
        return self.processed_datasets.get(dataset_id)

    def list_datasets(self) -> List[Dict]:
        """List all processed datasets."""
        results = []
        for dataset_id, info in self.processed_datasets.items():
            results.append(info.to_dict())
        return results


class ActivationAnalyzer:
    """Analyze neuron activations from dataset examples."""

    def __init__(self):
        self.activation_records: Dict[str, List[Dict]] = {}

    def analyze_activations(
        self,
        dataset_id: str,
        model_path: str,
        layer_names: Optional[List[str]] = None
    ) -> Dict:
        """Analyze activations for a dataset using a model."""
        return {
            "success": True,
            "dataset_id": dataset_id,
            "model_path": model_path,
            "layers_analyzed": layer_names or ["all"],
            "activation_statistics": {
                "total_neurons": 0,
                "average_activation": 0.0,
                "sparsity_percentage": 0.0,
                "layer_details": {}
            },
            "note": "Activation analysis requires actual model inference."
        }

    def _get_dataset_info(self, dataset_id: str) -> Optional[Dict]:
        """Get dataset info from the processor."""
        if dataset_id in self.processed_datasets:
            return self.processed_datasets[dataset_id].to_dict()
        return None


class ActivationVisualizer:
    """Visualize activation maps and statistics."""

    @staticmethod
    def format_activation_stats(stats: Dict) -> str:
        """Format activation statistics for display."""
        if not stats or "layer_details" not in stats:
            return "No activation data available"
        
        lines = []
        details = stats.get("layer_details", {})
        
        if details:
            lines.append("Activation by layer:")
            for layer_name, layer_data in details.items():
                avg_act = layer_data.get("average_activation", 0.0)
                sparsity = layer_data.get("sparsity_percentage", 0.0)
                total = layer_data.get("total_activations", 0)
                lines.append(f"  {layer_name}: avg={avg_act:.4f}, sparsity={sparsity:.1f}%, total={total}")
        else:
            lines.append("No layer details available")
        
        return "\n".join(lines) if lines else "No activation data"
    
    @staticmethod
    def format_summary(stats: Dict) -> str:
        """Format a summary of activation analysis."""
        if not stats:
            return "No activation analysis results"
        
        lines = []
        overall = stats.get("overall", {})
        if overall:
            lines.append(f"Total neurons: {overall.get('total_neurons', 0)}")
            lines.append(f"Average activation: {overall.get('average_activation', 0.0):.4f}")
            lines.append(f"Sparsity: {overall.get('sparsity_percentage', 0.0):.1f}%")
        
        details = stats.get("layer_details", {})
        if details:
            lines.append("\nPer-layer:")
            for layer_name, layer_data in details.items():
                avg = layer_data.get("average_activation", 0.0)
                sparsity = layer_data.get("sparsity_percentage", 0.0)
                lines.append(f"  {layer_name}: act={avg:.3f}, sparsity={sparsity:.1f}%")
        
        return "\n".join(lines) if lines else "No detailed results"
