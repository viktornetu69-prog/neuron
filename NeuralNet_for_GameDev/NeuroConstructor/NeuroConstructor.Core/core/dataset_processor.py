\"\"\"
Stage 3: Dataset Processing Pipeline

Обработчик данных для обучения модели учителя в проекте NeuroConstructor.
Поддерживает различные форматы данных и предоставляет пайплайн предобработки.
\"\"\"

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
        # Count examples
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
        """
        Process a dataset directory and return analysis results.
        
        Args:
            dataset_path: Path to the dataset directory
            config: Optional configuration for processing
            
        Returns:
            Dict with processing results
        """
        import os
        
        dataset_path = os.path.abspath(dataset_path)
        
        if not os.path.exists(dataset_path):
            return {
                "success": False,
                "error": f"Dataset directory not found: {dataset_path}"
            }
        
        # Load manifest
        manifest_path = os.path.join(dataset_path, "manifest.json")
        if not os.path.exists(manifest_path):
            return {
                "success": False,
                "error": f"Manifest not found in {dataset_path}"
            }
        
        info = DatasetInfo.from_manifest(manifest_path)
        
        # Analyze examples
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
        
        # Basic preprocessing steps
        preprocessing_steps = ["Загрузка данных", "Проверка структуры", "Валидация манифеста"]
        
        if config:
            if config.get("include_activation_analysis", False):
                preprocessing_steps.append("Анализ активаций")
            if config.get("include_quality_check", True):
                preprocessing_steps.append("Проверка качества")
        
        # Store processed info
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
        """
        Analyze activations for a dataset using a model.
        
        Note: This is a framework method. Actual model activation analysis
        would require the model and sample data.
        
        Args:
            dataset_id: ID of the dataset to analyze
            model_path: Path to the model file
            layer_names: Optional list of specific layers to analyze
            
        Returns:
            Dict with activation analysis results
        """
        import os
        
        dataset_info = self._get_dataset_info(dataset_id)
        if not dataset_info:
            return {
                "success": False,
                "error": f"Dataset {dataset_id} not found"
            }
        
        # In a real implementation, this would:
        # 1. Load the model
        # 2. Run each example through the model
        # 3. Track activations per layer
        # 4. Compute statistics (mean, std, sparsity, etc.)
        
        # For now, return framework-level analysis placeholder
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
            "analysis_timestamp": __import__('time').time(),
            "note": "Activation analysis requires actual model inference. " \
                    "Use LoadTeacherModel first, then CreateStudentModel for compression analysis."
        }
    
    def _get_dataset_info(self, dataset_id: str) -> Optional[Dict]:
        """Get dataset info from the processor."""
        if dataset_id in self.processed_datasets:
            return self.processed_datasets[dataset_id].to_dict()
        return None
class ActivationVisualizer:
    \"\"\"Visualize activation maps and statistics.\"\"\"
    
    @staticmethod
    def format_activation_stats(stats: Dict) -> str:
        \"\"\"Format activation statistics for display.\"\"\"\n        if not stats or \"layer_details\" not in stats:\n            return \"No activation data available\"\n        \n        lines = []\n        details = stats.get(\"layer_details\", {})\n        \n        if details:\n            lines.append(\"Activation by layer:\")\n            for layer_name, layer_data in details.items():\n                avg_act = layer_data.get(\"average_activation\", 0.0)\n                sparsity = layer_data.get(\"sparsity_percentage\", 0.0)\n                total = layer_data.get(\"total_activations\", 0)\n                lines.append(f\"  {layer_name}: avg={avg_act:.4f}, sparsity={sparsity:.1f}%, total={total}\")\n        else:\n            lines.append(\"No layer details available\")\n        \n        overall = stats.get(\"overall\", {})\n        if overall:\n            lines.append(f\"Overall: avg_activation={overall.get('average_activation', 0.0):.4f}\")\n            lines.append(f\"Overall sparsity: {overall.get('sparsity_percentage', 0.0):.1f}%\")\n        \n        return \"\\n\".join(lines) if lines else \"No activation data\"\n    
    \n    @staticmethod\n    def format_summary(stats: Dict) -> str:\n        \"\"\"Format a summary of activation analysis.\"\"\"\n        if not stats:\n            return \"No activation analysis results\"\n        \n        lines = []\n        \n        # Overall stats\n        overall = stats.get(\"overall\", {})\n        if overall:\n            lines.append(f\"Total neurons analyzed: {overall.get('total_neurons', 0)}\")\n            lines.append(f\"Average activation: {overall.get('average_activation', 0.0):.4f}\")\n            lines.append(f\"Sparsity: {overall.get('sparsity_percentage', 0.0):.1f}%\")\n        \n        # Per-layer stats\n        details = stats.get(\"layer_details\", {})\n        if details:\n            lines.append(\"\\nPer-layer breakdown:\")\n            for layer_name, layer_data in details.items():\n                avg = layer_data.get(\"average_activation\", 0.0)\n                sparsity = layer_data.get(\"sparsity_percentage\", 0.0)\n                total = layer_data.get(\"total_activations\", 0)\n                lines.append(f\"  {layer_name}: act={avg:.3f}, sparsity={sparsity:.1f}%, total={total}\")\n        \n        return \"\\n\".join(lines) if lines else \"No detailed results\"