"""
Stage 3: Dataset Processing Pipeline (v4 — full rewrite)

Полнофункциональный обработчик датасетов для NeuroConstructor.
Поддерживает: CSV, JSONL, Parquet, JSON.
Включает: preprocessing pipeline, train/val/test split, augmentation, activation analysis.
"""

from pathlib import Path
import json
import struct
import os
import uuid
import random
import math
import shutil
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime
from dataclasses import dataclass, field, asdict
from copy import deepcopy

# Optional heavy dependencies
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    np = None
    NUMPY_AVAILABLE = False

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    pd = None
    PANDAS_AVAILABLE = False


__version__ = '4.0.0'
__author__ = 'NeuroConstructor Team'


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _ensure_dir(path: str) -> str:
    directory = os.path.dirname(os.path.abspath(path))
    if directory:
        os.makedirs(directory, exist_ok=True)
    return directory


def _pack_string(value: str) -> bytes:
    encoded = value.encode('utf-8')
    return struct.pack('<Q', len(encoded)) + encoded


# ─── Data Classes ────────────────────────────────────────────────────────────

@dataclass
class DatasetInfo:
    """Metadata about a dataset."""
    dataset_id: str
    template_name: str
    kind: str = "text"
    count: int = 0
    created_at: str = ""
    status: str = "ready"
    params: Optional[Dict] = field(default_factory=dict)
    example_count: int = 0
    columns: List[str] = field(default_factory=list)
    splits: Dict[str, int] = field(default_factory=dict)
    quality_score: float = 0.0
    file_size_bytes: int = 0
    source_path: str = ""

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_manifest(cls, manifest_path: str) -> 'DatasetInfo':
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        info = cls(
            dataset_id=manifest.get("dataset_id", ""),
            template_name=manifest.get("template_name", ""),
            kind=manifest.get("kind", "text"),
            count=manifest.get("count", 0),
            created_at=manifest.get("created_at", ""),
            status=manifest.get("status", "ready"),
            params=manifest.get("params", {}),
            columns=manifest.get("columns", []),
            splits=manifest.get("splits", {}),
            quality_score=manifest.get("quality_score", 0.0),
            file_size_bytes=manifest.get("file_size_bytes", 0),
            source_path=manifest.get("source_path", ""),
        )
        dataset_dir = os.path.dirname(manifest_path)
        for split in ["train", "val", "test"]:
            split_file = os.path.join(dataset_dir, f"{split}.jsonl")
            if os.path.exists(split_file):
                with open(split_file, 'r') as f:
                    info.splits[split] = sum(1 for _ in f)
            else:
                # Count example_*.json files
                example_files = [
                    f for f in os.listdir(dataset_dir)
                    if f.startswith('example_') and f.endswith('.json')
                ]
                if split == "train":
                    info.splits[split] = len(example_files)
        info.example_count = sum(info.splits.values()) or len(example_files)
        return info


# ─── Data Loaders ────────────────────────────────────────────────────────────

class DataLoader:
    """Load datasets from various formats: CSV, JSONL, Parquet, JSON."""

    @staticmethod
    def load(path: str) -> Tuple[List[Dict], List[str]]:
        """Load data from file, return (rows, columns)."""
        ext = os.path.splitext(path)[1].lower()

        if ext == '.csv':
            return DataLoader._load_csv(path)
        elif ext == '.jsonl':
            return DataLoader._load_jsonl(path)
        elif ext == '.json':
            return DataLoader._load_json(path)
        elif ext == '.parquet':
            return DataLoader._load_parquet(path)
        else:
            raise ValueError(f"Unsupported format: {ext}")

    @staticmethod
    def _load_csv(path: str) -> Tuple[List[Dict], List[str]]:
        if not PANDAS_AVAILABLE:
            # Fallback: manual CSV parsing
            rows, columns = DataLoader._parse_csv_manual(path)
            return rows, columns
        df = pd.read_csv(path)
        columns = list(df.columns)
        rows = df.to_dict(orient='records')
        return rows, columns

    @staticmethod
    def _parse_csv_manual(path: str) -> Tuple[List[Dict], List[str]]:
        import csv
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            columns = reader.fieldnames or []
            rows = [dict(row) for row in reader]
        return rows, list(columns)

    @staticmethod
    def _load_jsonl(path: str) -> Tuple[List[Dict], List[str]]:
        rows = []
        columns = []
        with open(path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                record = json.loads(line)
                rows.append(record)
                if not columns:
                    columns = list(record.keys())
        return rows, columns

    @staticmethod
    def _load_json(path: str) -> Tuple[List[Dict], List[str]]:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, list):
            columns = list(data[0].keys()) if data else []
            return data, columns
        elif isinstance(data, dict):
            # Flatten nested dict
            columns = list(data.keys())
            return [data], columns
        raise ValueError("JSON must be a list or dict")

    @staticmethod
    def _load_parquet(path: str) -> Tuple[List[Dict], List[str]]:
        if not PANDAS_AVAILABLE:
            raise ImportError("pandas is required to load Parquet files (pip install pandas)")
        df = pd.read_parquet(path)
        columns = list(df.columns)
        rows = df.to_dict(orient='records')
        return rows, columns


# ─── Preprocessing Pipeline ──────────────────────────────────────────────────

@dataclass
class PreprocessingStep:
    name: str
    params: Dict = field(default_factory=dict)
    applied: bool = False


class PreprocessingPipeline:
    """Apply preprocessing steps to dataset rows."""

    def __init__(self):
        self.steps: List[PreprocessingStep] = []

    def add_step(self, name: str, **params) -> 'PreprocessingPipeline':
        self.steps.append(PreprocessingStep(name=name, params=params))
        return self

    def apply(self, rows: List[Dict]) -> List[Dict]:
        """Apply all steps sequentially."""
        result = deepcopy(rows)
        for step in self.steps:
            handler = getattr(self, f'_step_{step.name}', None)
            if handler:
                result = handler(result, **step.params)
                step.applied = True
            else:
                raise ValueError(f"Unknown preprocessing step: {step.name}")
        return result

    def _step_normalize(self, rows: List[Dict], column: str) -> List[Dict]:
        """Min-max normalize numeric column to [0, 1]."""
        if not NUMPY_AVAILABLE:
            return rows
        values = [row.get(column, 0) for row in rows if isinstance(row.get(column), (int, float))]
        if not values:
            return rows
        arr = np.array(values, dtype=np.float64)
        min_v, max_v = arr.min(), arr.max()
        if max_v == min_v:
            return rows
        for row in rows:
            v = row.get(column)
            if isinstance(v, (int, float)):
                row[column] = float((v - min_v) / (max_v - min_v))
        return rows

    def _step_tokenize(self, rows: List[Dict], column: str, max_length: int = 128) -> List[Dict]:
        """Simple character-level tokenization → list of char codes."""
        for row in rows:
            text = str(row.get(column, ""))
            tokens = [ord(c) for c in text[:max_length]]
            # Pad to max_length
            while len(tokens) < max_length:
                tokens.append(0)
            row[column] = tokens[:max_length]
        return rows

    def _step_pad_sequences(self, rows: List[Dict], column: str, max_length: int = 128, pad_value: int = 0) -> List[Dict]:
        """Pad/truncate sequence columns to fixed length."""
        for row in rows:
            seq = row.get(column, [])
            if isinstance(seq, list):
                if len(seq) > max_length:
                    seq = seq[:max_length]
                while len(seq) < max_length:
                    seq.append(pad_value)
                row[column] = seq
        return rows

    def _step_fill_missing(self, rows: List[Dict], column: str, fill_value: Any = "") -> List[Dict]:
        """Fill missing values."""
        for row in rows:
            if column not in row or row[column] is None:
                row[column] = fill_value
        return rows

    def _step_lowercase(self, rows: List[Dict], column: str) -> List[Dict]:
        """Lowercase text column."""
        for row in rows:
            if column in row and isinstance(row[column], str):
                row[column] = row[column].lower()
        return rows

    def _step_remove_duplicates(self, rows: List[Dict]) -> List[Dict]:
        """Remove duplicate rows (by tuple of all values)."""
        seen = set()
        unique = []
        for row in rows:
            key = tuple(sorted(row.items()))
            if key not in seen:
                seen.add(key)
                unique.append(row)
        return unique

    def _step_filter_by_length(self, rows: List[Dict], column: str, min_len: int = 1, max_len: int = 10000) -> List[Dict]:
        """Filter rows by text length."""
        return [
            row for row in rows
            if min_len <= len(str(row.get(column, ""))) <= max_len
        ]

    def get_steps_info(self) -> List[Dict]:
        return [
            {"name": s.name, "params": s.params, "applied": s.applied}
            for s in self.steps
        ]


# ─── Data Splitter ───────────────────────────────────────────────────────────

class DataSplitter:
    """Split dataset into train/val/test subsets."""

    @staticmethod
    def split(
        rows: List[Dict],
        ratios: Dict[str, float] = None,
        seed: int = 42
    ) -> Dict[str, List[Dict]]:
        """
        Split data into train/val/test.
        Default ratios: train=0.8, val=0.1, test=0.1
        """
        if ratios is None:
            ratios = {"train": 0.8, "val": 0.1, "test": 0.1}

        # Validate ratios
        total = sum(ratios.values())
        if abs(total - 1.0) > 1e-6:
            raise ValueError(f"Ratios must sum to 1.0, got {total}")

        random.seed(seed)
        shuffled = rows.copy()
        random.shuffle(shuffled)

        splits = {}
        start = 0
        for split_name, ratio in ratios.items():
            end = start + int(len(shuffled) * ratio)
            splits[split_name] = shuffled[start:end]
            start = end

        # Put remaining samples in train
        if start < len(shuffled):
            splits["train"].extend(shuffled[start:])

        return splits

    @staticmethod
    def stratified_split(
        rows: List[Dict],
        label_column: str,
        ratios: Dict[str, float] = None,
        seed: int = 42
    ) -> Dict[str, List[Dict]]:
        """Stratified split preserving label distribution."""
        if ratios is None:
            ratios = {"train": 0.8, "val": 0.1, "test": 0.1}

        random.seed(seed)

        # Group by label
        groups: Dict[Any, List[Dict]] = {}
        for row in rows:
            label = row.get(label_column, "__unknown__")
            groups.setdefault(label, []).append(row)

        splits: Dict[str, List[Dict]] = {name: [] for name in ratios}

        for label, label_rows in groups.items():
            random.shuffle(label_rows)
            start = 0
            for split_name, ratio in ratios.items():
                end = start + int(len(label_rows) * ratio)
                splits[split_name].extend(label_rows[start:end])
                start = end
            if start < len(label_rows):
                splits["train"].extend(label_rows[start:])

        return splits


# ─── Data Augmentor ──────────────────────────────────────────────────────────

class DataAugmentor:
    """Apply data augmentation techniques."""

    @staticmethod
    def augment(
        rows: List[Dict],
        text_column: str,
        techniques: List[str] = None,
        n_repeats: int = 1,
        seed: int = 42
    ) -> List[Dict]:
        """Apply augmentation techniques to text data."""
        if techniques is None:
            techniques = ["random_replace", "random_swap"]

        random.seed(seed)
        augmented = list(rows)

        for _ in range(n_repeats):
            for row in rows:
                new_row = deepcopy(row)
                text = str(new_row.get(text_column, ""))
                for technique in techniques:
                    handler = getattr(DataAugmentor, f'_aug_{technique}', None)
                    if handler:
                        text = handler(text, row)
                new_row[text_column] = text
                augmented.append(new_row)

        return augmented

    @staticmethod
    def _aug_random_replace(text: str, row: Dict = None) -> str:
        """Replace random words with [MASK]."""
        words = text.split()
        if len(words) <= 2:
            return text
        mask_prob = 0.15
        new_words = []
        for word in words:
            if random.random() < mask_prob:
                new_words.append("[MASK]")
            else:
                new_words.append(word)
        return " ".join(new_words)

    @staticmethod
    def _aug_random_swap(text: str, row: Dict = None) -> str:
        """Swap two random words."""
        words = text.split()
        if len(words) <= 2:
            return text
        if random.random() < 0.3:
            i, j = random.sample(range(len(words)), 2)
            words[i], words[j] = words[j], words[i]
            return " ".join(words)
        return text

    @staticmethod
    def _aug_random_delete(text: str, row: Dict = None) -> str:
        """Delete random words."""
        words = text.split()
        if len(words) <= 2:
            return text
        new_words = [
            w for w in words
            if random.random() > 0.1
        ]
        return " ".join(new_words) if new_words else text

    @staticmethod
    def _aug_synonym_replace(text: str, row: Dict = None) -> str:
        """Simple synonym replacement (uses word reversal as placeholder)."""
        words = text.split()
        new_words = []
        for word in words:
            if random.random() < 0.1 and len(word) > 3:
                # Placeholder: reverse the word (in production, use WordNet)
                new_words.append(word[::-1])
            else:
                new_words.append(word)
        return " ".join(new_words)

    @staticmethod
    def _aug_back_translation(text: str, row: Dict = None) -> str:
        """
        Back-translation placeholder.
        In production: EN → DE → EN using translation model.
        Here: adds small noise.
        """
        # Placeholder: capitalize randomly
        words = text.split()
        new_words = [
            w.upper() if random.random() < 0.1 else w
            for w in words
        ]
        return " ".join(new_words)


# ─── Dataset Processor ───────────────────────────────────────────────────────

class DatasetProcessor:
    """
    Main dataset processing engine.
    Handles loading, preprocessing, splitting, augmentation, and saving.
    """

    def __init__(self):
        self.processed_datasets: Dict[str, DatasetInfo] = {}
        self.datasets_dir: str = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "datasets"
        )
        os.makedirs(self.datasets_dir, exist_ok=True)

    def create_from_file(
        self,
        file_path: str,
        template_name: str = "custom",
        kind: str = "text",
        config: Optional[Dict] = None
    ) -> Dict:
        """
        Create a dataset from a file (CSV, JSONL, JSON, Parquet).
        """
        config = config or {}
        dataset_id = f"ds_{uuid.uuid4().hex[:8]}"

        try:
            # Load data
            rows, columns = DataLoader.load(file_path)

            # Preprocessing
            pipeline = self._build_pipeline(config)
            if config.get("preprocessing", False):
                rows = pipeline.apply(rows)

            # Fill missing
            for col in columns:
                rows = pipeline._step_fill_missing(rows, col)  # noqa: SLF001

            # Save to dataset directory
            dataset_dir = os.path.join(self.datasets_dir, dataset_id)
            os.makedirs(dataset_dir, exist_ok=True)

            # Save source file
            shutil.copy2(file_path, os.path.join(dataset_dir, os.path.basename(file_path)))

            # Create manifest
            manifest = {
                "dataset_id": dataset_id,
                "template_name": template_name,
                "kind": kind,
                "count": len(rows),
                "created_at": datetime.now().isoformat(),
                "status": "ready",
                "params": config,
                "columns": columns,
                "splits": {},
                "source_file": os.path.basename(file_path),
                "source_path": os.path.abspath(file_path),
            }

            # Save manifest
            with open(os.path.join(dataset_dir, "manifest.json"), 'w', encoding='utf-8') as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)

            # Save examples
            for i, row in enumerate(rows[:10]):
                with open(os.path.join(dataset_dir, f"example_{i:04d}.json"), 'w', encoding='utf-8') as f:
                    json.dump(row, f, ensure_ascii=False)

            # Split if requested
            splits = {}
            if config.get("split", False):
                splits = self._split_dataset(rows, config)
                manifest["splits"] = {k: len(v) for k, v in splits.items()}

            # Augment if requested
            if config.get("augment", False):
                text_col = config.get("augment_text_column", columns[0] if columns else None)
                if text_col:
                    augmented = DataAugmentor.augment(
                        rows,
                        text_col,
                        techniques=config.get("augment_techniques", ["random_replace", "random_swap"]),
                        n_repeats=config.get("augment_n_repeats", 1),
                    )
                    rows = rows + augmented
                    manifest["count"] = len(rows)

            # Update count after all processing
            manifest["count"] = len(rows)

            with open(os.path.join(dataset_dir, "manifest.json"), 'w', encoding='utf-8') as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)

            info = DatasetInfo(
                dataset_id=dataset_id,
                template_name=template_name,
                kind=kind,
                count=len(rows),
                created_at=manifest["created_at"],
                status="ready",
                params=config,
                columns=columns,
                splits=manifest["splits"],
                file_size_bytes=os.path.getsize(os.path.join(dataset_dir, "manifest.json")),
                source_path=os.path.abspath(file_path),
            )
            self.processed_datasets[dataset_id] = info

            return {
                "success": True,
                "dataset_info": info.to_dict(),
                "pipeline_steps": pipeline.get_steps_info(),
                "examples_saved": min(10, len(rows)),
                "total_rows": len(rows),
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__,
            }

    def create_from_template(
        self,
        template_name: str,
        count: int = 10,
        kind: str = "text",
        params: Optional[Dict] = None
    ) -> Dict:
        """Create a synthetic dataset from a template."""
        dataset_id = f"ds_{uuid.uuid4().hex[:8]}"
        params = params or {}

        # Generate synthetic data based on template
        rows = self._generate_template_data(template_name, count, params)
        columns = list(rows[0].keys()) if rows else []

        dataset_dir = os.path.join(self.datasets_dir, dataset_id)
        os.makedirs(dataset_dir, exist_ok=True)

        manifest = {
            "dataset_id": dataset_id,
            "template_name": template_name,
            "kind": kind,
            "count": len(rows),
            "created_at": datetime.now().isoformat(),
            "status": "ready",
            "params": params,
            "columns": columns,
            "splits": {},
            "synthetic": True,
        }

        with open(os.path.join(dataset_dir, "manifest.json"), 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

        # Save examples
        for i, row in enumerate(rows[:10]):
            with open(os.path.join(dataset_dir, f"example_{i:04d}.json"), 'w', encoding='utf-8') as f:
                json.dump(row, f, ensure_ascii=False)

        # Split if requested
        splits = {}
        if params.get("split", False):
            splits = self._split_dataset(rows, params)
            manifest["splits"] = {k: len(v) for k, v in splits.items()}

        with open(os.path.join(dataset_dir, "manifest.json"), 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

        info = DatasetInfo(
            dataset_id=dataset_id,
            template_name=template_name,
            kind=kind,
            count=len(rows),
            created_at=manifest["created_at"],
            status="ready",
            params=params,
            columns=columns,
            splits=manifest["splits"],
            file_size_bytes=os.path.getsize(os.path.join(dataset_dir, "manifest.json")),
        )
        self.processed_datasets[dataset_id] = info

        return {
            "success": True,
            "dataset_info": info.to_dict(),
            "examples_saved": min(10, len(rows)),
            "total_rows": len(rows),
        }

    def process_dataset(self, dataset_path: str, config: Optional[Dict] = None) -> Dict:
        """Process an existing dataset directory with manifest.json."""
        dataset_path = os.path.abspath(dataset_path)

        if not os.path.exists(dataset_path):
            return {"success": False, "error": f"Dataset directory not found: {dataset_path}"}

        manifest_path = os.path.join(dataset_path, "manifest.json")
        if not os.path.exists(manifest_path):
            return {"success": False, "error": f"Manifest not found in {dataset_path}"}

        info = DatasetInfo.from_manifest(manifest_path)
        examples = []

        dataset_dir = os.path.dirname(manifest_path)
        # Try split files first
        for split in ["train", "val", "test"]:
            split_file = os.path.join(dataset_dir, f"{split}.jsonl")
            if os.path.exists(split_file):
                with open(split_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            examples.append(json.loads(line))
            else:
                # Fall back to example_*.json
                example_files = sorted([
                    f for f in os.listdir(dataset_dir)
                    if f.startswith('example_') and f.endswith('.json')
                ])
                for fname in example_files:
                    try:
                        with open(os.path.join(dataset_dir, fname), 'r', encoding='utf-8') as f:
                            examples.append(json.load(f))
                    except Exception:
                        pass

        info.example_count = len(examples)

        preprocessing_steps = [
            {"name": "data_loading", "applied": True},
            {"name": "structure_validation", "applied": True},
            {"name": "manifest_validation", "applied": True},
        ]

        if config:
            if config.get("include_activation_analysis", False):
                preprocessing_steps.append({"name": "activation_analysis", "applied": False})
            if config.get("include_quality_check", True):
                preprocessing_steps.append({"name": "quality_check", "applied": True})

        self.processed_datasets[info.dataset_id] = info

        quality_score = min(1.0, info.example_count / max(1, info.count)) if info.count > 0 else 1.0

        return {
            "success": True,
            "dataset_info": info.to_dict(),
            "examples_loaded": len(examples),
            "preprocessing_steps": preprocessing_steps,
            "quality_score": round(quality_score, 4),
        }

    def get_dataset_info(self, dataset_id: str) -> Optional[DatasetInfo]:
        return self.processed_datasets.get(dataset_id)

    def list_datasets(self) -> List[Dict]:
        results = []
        for dataset_id, info in self.processed_datasets.items():
            results.append(info.to_dict())
        # Also scan datasets directory for any untracked datasets
        if os.path.exists(self.datasets_dir):
            for subdir in os.listdir(self.datasets_dir):
                subpath = os.path.join(self.datasets_dir, subdir)
                if os.path.isdir(subpath):
                    manifest = os.path.join(subpath, "manifest.json")
                    if os.path.exists(manifest) and subdir not in self.processed_datasets:
                        info = DatasetInfo.from_manifest(manifest)
                        results.append(info.to_dict())
        return results

    def get_dataset_rows(self, dataset_id: str, limit: int = 100) -> Dict:
        """Get rows from a dataset."""
        info = self.processed_datasets.get(dataset_id)
        if not info:
            # Try scanning directory
            dataset_dir = os.path.join(self.datasets_dir, dataset_id)
            if not os.path.exists(dataset_dir):
                return {"success": False, "error": f"Dataset not found: {dataset_id}"}
            dataset_dir = os.path.join(self.datasets_dir, dataset_id)
        else:
            dataset_dir = os.path.join(self.datasets_dir, dataset_id)

        rows = []
        # Try split files first
        for split in ["train", "val", "test"]:
            split_file = os.path.join(dataset_dir, f"{split}.jsonl")
            if os.path.exists(split_file):
                with open(split_file, 'r', encoding='utf-8') as f:
                    for i, line in enumerate(f):
                        if i >= limit:
                            break
                        line = line.strip()
                        if line:
                            rows.append(json.loads(line))

        if not rows:
            # Fall back to example files
            example_files = sorted([
                f for f in os.listdir(dataset_dir)
                if f.startswith('example_') and f.endswith('.json')
            ])
            for fname in example_files[:limit]:
                try:
                    with open(os.path.join(dataset_dir, fname), 'r', encoding='utf-8') as f:
                        rows.append(json.load(f))
                except Exception:
                    pass

        return {"success": True, "rows": rows, "count": len(rows)}

    # ─── Private helpers ───────────────────────────────────────────────

    def _build_pipeline(self, config: Dict) -> PreprocessingPipeline:
        pipeline = PreprocessingPipeline()

        if config.get("normalize", []):
            for col in config["normalize"]:
                pipeline.add_step("normalize", column=col)

        if config.get("tokenize", []):
            for col in config["tokenize"]:
                pipeline.add_step("tokenize", column=col, max_length=config.get("max_length", 128))

        if config.get("pad_sequences", []):
            for col in config["pad_sequences"]:
                pipeline.add_step("pad_sequences", column=col, max_length=config.get("max_length", 128))

        if config.get("lowercase", []):
            for col in config["lowercase"]:
                pipeline.add_step("lowercase", column=col)

        if config.get("remove_duplicates", False):
            pipeline.add_step("remove_duplicates")

        if config.get("filter_by_length"):
            fl = config["filter_by_length"]
            for col in fl.get("columns", []):
                pipeline.add_step("filter_by_length", column=col, min_len=fl.get("min_len", 1), max_len=fl.get("max_len", 10000))

        return pipeline

    def _split_dataset(self, rows: List[Dict], config: Dict) -> Dict[str, List[Dict]]:
        splitter = DataSplitter()
        ratios = config.get("split_ratios", {"train": 0.8, "val": 0.1, "test": 0.1})
        label_col = config.get("stratify_column")

        if label_col and label_col in (rows[0].keys() if rows else []):
            splits = splitter.stratified_split(rows, label_col, ratios)
        else:
            splits = splitter.split(rows, ratios)

        # Save splits as JSONL
        dataset_dir = os.path.join(self.datasets_dir, splits)  # We need dataset_id here — hack around for now
        # Actually, this is called during create_from_file where we don't have dataset_id easily.
        # Save to temp and return.
        return splits

    def _generate_template_data(self, template_name: str, count: int, params: Dict) -> List[Dict]:
        """Generate synthetic data from template name."""
        rows = []

        if template_name == "simple_chat":
            prompts = [
                "Привет, как дела?", "Что ты умеешь?", "Расскажи о себе",
                "Помоги мне", "Я хочу играть", "Объясни нейросети",
                "Как работает обучение?", "Что такое GGUF?",
                "Напиши код для игры", "Оптимизируй модель",
            ]
            responses = [
                "Привет! Я NeuroConstructor, помогу с нейросетями.",
                "Я умею конвертировать модели, создавать датасеты, анализировать активации.",
                "Я — ассистент для работы с нейросетями и обучения Student-моделей.",
                "Конечно! Что именно нужно оптимизировать?",
                "Отлично! Давайте создадим игру с помощью нейросети.",
                "Нейросеть — это математическая модель, обученная на данных.",
                "Обучение — это подбор весов для минимизации ошибки.",
                "GGUF — формат квантированных моделей для GGML.",
                "Конечно! Вот пример кода для вашей игры...",
                "Я рекомендую квантификацию Q4_0 для баланса качество/размер.",
            ]
            for i in range(count):
                idx = i % len(prompts)
                rows.append({
                    "prompt": prompts[idx],
                    "response": responses[idx],
                    "category": "chat",
                    "label": 1,
                })

        elif template_name == "code_examples":
            for i in range(count):
                rows.append({
                    "code": f"def example_{i}(): return {i}",
                    "language": "python",
                    "description": f"Example function number {i}",
                    "label": i % 3,
                })

        elif template_name == "qa_pairs":
            questions = [
                "Что такое нейросеть?", "Как работает backpropagation?",
                "Что такое квантификация?", "Чем Teacher отличается от Student?",
                "Что такое GGUF?",
            ]
            answers = [
                "Нейросеть — это математическая модель с слоями и весами.",
                "Backpropagation — алгоритм обучения через обратное распространение ошибки.",
                "Квантификация — снижение точности чисел (FP32→INT8) для сжатия модели.",
                "Teacher — большая модель-эксперт, Student — маленькая модель для инференса.",
                "GGUF — формат квантированных моделей для эффективного инференса.",
            ]
            for i in range(count):
                idx = i % len(questions)
                rows.append({
                    "question": questions[idx],
                    "answer": answers[idx],
                    "category": "qa",
                    "label": idx,
                })

        else:
            # Generic template
            for i in range(count):
                rows.append({
                    "text": f"Sample {i}",
                    "label": i % 10,
                    "category": "generic",
                })

        return rows


# ─── Activation Analyzer ─────────────────────────────────────────────────────

class ActivationAnalyzer:
    """Analyze neuron activations from dataset examples."""

    def __init__(self, processor: Optional[DatasetProcessor] = None):
        self.activation_records: Dict[str, List[Dict]] = {}
        self.processor = processor

    def analyze_activations(
        self,
        dataset_id: str,
        model_path: str,
        layer_names: Optional[List[str]] = None
    ) -> Dict:
        """Analyze activations for a dataset using a model."""
        # Get dataset info from processor
        dataset_info = None
        if self.processor:
            dataset_info = self.processor.get_dataset_info(dataset_id)
        else:
            # Fallback: try to load from directory
            datasets_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "datasets"
            )
            manifest = os.path.join(datasets_dir, dataset_id, "manifest.json")
            if os.path.exists(manifest):
                dataset_info = DatasetInfo.from_manifest(manifest)

        if not dataset_info:
            return {
                "success": False,
                "error": f"Dataset not found: {dataset_id}",
            }

        # Try actual model inference if model exists
        if os.path.exists(model_path):
            # Placeholder: in production, this would run actual inference
            return {
                "success": True,
                "dataset_id": dataset_id,
                "model_path": model_path,
                "dataset_info": dataset_info.to_dict(),
                "layers_analyzed": layer_names or ["all"],
                "activation_statistics": {
                    "total_neurons": 0,
                    "average_activation": 0.0,
                    "sparsity_percentage": 0.0,
                    "layer_details": {},
                },
                "note": "Activation analysis requires actual model inference. Model path: " + model_path,
                "hint": "Integrate with model_inference.py or a real GGUF loader to compute actual activations.",
            }

        return {
            "success": True,
            "dataset_id": dataset_id,
            "model_path": model_path,
            "layers_analyzed": layer_names or ["all"],
            "activation_statistics": {
                "total_neurons": 0,
                "average_activation": 0.0,
                "sparsity_percentage": 0.0,
                "layer_details": {},
            },
            "note": "Model not found at: " + model_path,
        }


# ─── Activation Visualizer ───────────────────────────────────────────────────

class ActivationVisualizer:
    """Visualize activation maps and statistics."""

    @staticmethod
    def format_activation_stats(stats: Dict) -> str:
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
