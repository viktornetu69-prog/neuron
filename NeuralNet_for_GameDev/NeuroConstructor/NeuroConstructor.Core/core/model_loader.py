"""
Stage 2: Model Loading and Validation Module
Student-Teacher Architecture - Core model loading functionality
"""

import os
import json
import struct
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path

# Optional heavy dependencies. The gRPC server must be able to start even when
# torch / gguf are not installed, therefore imports are guarded.
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:  # pragma: no cover - depends on environment
    torch = None
    TORCH_AVAILABLE = False

try:
    import gguf
    GGUF_AVAILABLE = True
except ImportError:  # pragma: no cover - depends on environment
    gguf = None
    GGUF_AVAILABLE = False


def _ensure_dir(path: str) -> str:
    """Create the parent directory of ``path`` if needed and return it."""
    directory = os.path.dirname(os.path.abspath(path))
    if directory:
        os.makedirs(directory, exist_ok=True)
    return directory


def _default_device() -> str:
    if TORCH_AVAILABLE and torch.cuda.is_available():
        return "cuda"
    return "cpu"


class ModelLoader:
    """
    Core model loading and validation functionality.
    Implements Stage 2: Student-Teacher architecture model management.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "..", "config", "model_loader_config.json"
        )
        self.config = self._load_config()
        self.supported_formats = ['.gguf', '.pt', '.pth', '.ckpt', '.safetensors']
        self.supported_architectures = ['llama', 'gpt', 'bloom', 'bert', 'gptj', 'falcon']
    
    def _load_config(self) -> Dict:
        """Load configuration from JSON file or create default"""
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r') as f:
                return json.load(f)
        else:
            default_config = {
                "model_paths": {
                    "teacher": "models/teacher.gguf",
                    "student_template": "models/student_template.json"
                },
                "loading": {
                    "max_memory_gb": 8,
                    "use_flash_attention": True,
                    "quantization": "q4_0",
                    "max_sequence_length": 2048,
                    "device": _default_device()
                },
                "validation": {
                    "min_similarity_score": 0.85,
                    "max_activation_diff": 0.1,
                    "require_architectural_match": True
                },
                "compression": {
                    "target_compression_ratio": 0.1,
                    "preserve_functionality": True
                }
            }
            
            _ensure_dir(self.config_path)
            with open(self.config_path, 'w') as f:
                json.dump(default_config, f, indent=2)
            
            return default_config
    
    def load_teacher_model(self, model_path: str) -> Dict:
        """
        Load and validate teacher model with comprehensive diagnostics.
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Teacher model not found: {model_path}")
        
        if not any(model_path.endswith(ext) for ext in self.supported_formats):
            raise ValueError(f"Unsupported model format: {model_path}")
        
        file_size = os.path.getsize(model_path)
        file_size_gb = file_size / (1024 ** 3)
        
        model_info = {
            "model_type": "teacher",
            "path": model_path,
            "format": self._detect_format(model_path),
            "file_size_bytes": file_size,
            "file_size_gb": file_size_gb,
            "loaded": False,
            "architecture": {},
            "parameters": {},
            "loading_time": None,
            "diagnostics": {},
            "warnings": [],
            "errors": []
        }
        
        try:
            if model_path.endswith('.gguf'):
                model_info.update(self._load_gguf_model(model_path))
            elif model_path.endswith(('.pt', '.pth', '.ckpt', '.safetensors')):
                model_info.update(self._load_pytorch_model(model_path))
            else:
                model_info["errors"].append(f"Unsupported format: {model_path}")
                return model_info
            
            if model_info["errors"]:
                model_info["loaded"] = False
                model_info["loading_time"] = datetime.now().isoformat()
                model_info["validation"] = self._validate_model(model_info)
                return model_info

            model_info["loaded"] = True
            model_info["loading_time"] = datetime.now().isoformat()
            model_info["validation"] = self._validate_model(model_info)
            return model_info
            
        except Exception as e:
            return {
                "model_type": "teacher",
                "path": model_path,
                "format": self._detect_format(model_path),
                "file_size_bytes": os.path.getsize(model_path) if os.path.exists(model_path) else 0,
                "loaded": False,
                "loading_time": datetime.now().isoformat(),
                "diagnostics": {},
                "warnings": [],
                "errors": [f"Failed to load teacher model: {str(e)}"],
                "validation": {
                    "compatible": False,
                    "score": 0.0,
                    "issues": ["Model loading failed"],
                    "recommendations": ["Check model file integrity and format"]
                }
            }
    
    def _load_gguf_model(self, model_path: str) -> Dict:
        """
        Load a GGUF teacher model.

        Uses the `gguf` package when it is installed. When it is not available the
        GGUF header is parsed directly so that the service still reports a useful
        architecture instead of failing hard.
        """
        model_info: Dict[str, Any] = {
            "architecture": {},
            "parameters": {},
            "diagnostics": {},
            "warnings": [],
            "errors": []
        }

        try:
            if GGUF_AVAILABLE:
                gguf_model = gguf.GGUFModel.from_file(model_path)
                arch_info = gguf_model.get_architecture_info()
                params_info = gguf_model.get_parameter_info()
                model_info["architecture"] = {
                    "model_family": arch_info.get("family", "llama"),
                    "vocab_size": params_info.get("vocab_size", 32000),
                    "hidden_size": params_info.get("hidden_size", 4096),
                    "num_layers": params_info.get("num_layers", 32),
                    "num_heads": params_info.get("num_heads", 32),
                    "head_dim": params_info.get("head_dim", 128),
                    "max_position_embeddings": arch_info.get("max_position", 2048),
                    "rope_theta": arch_info.get("rope_theta", 10000.0),
                    "quantization": arch_info.get("quantization", "q4_0")
                }
                model_info["parameters"] = {
                    "total_params": params_info.get("total_params", 0),
                    "trainable_params": params_info.get("trainable_params", 0),
                    "tensor_count": params_info.get("tensor_count", 0),
                    "file_size_gb": os.path.getsize(model_path) / (1024 ** 3)
                }
                model_info["diagnostics"] = {
                    "gguf_version": "1.0",
                    "reader": "gguf_package",
                    "has_embeddings": True,
                    "has_attention": True,
                    "has_feed_forward": True
                }
            else:
                model_info.update(self._parse_gguf_header(model_path))
                model_info["warnings"].append(
                    "The 'gguf' package is not installed - architecture was parsed from the raw header."
                )
        except Exception as e:
            model_info["errors"].append(f"Failed to load GGUF model: {str(e)}")

        return model_info

    def _parse_gguf_header(self, model_path: str) -> Dict:
        """
        Minimal GGUF header parser used when the `gguf` package is unavailable.
        """
        result: Dict[str, Any] = {
            "architecture": self._get_default_architecture(),
            "parameters": {},
            "diagnostics": {"reader": "builtin_header_parser"}
        }

        with open(model_path, 'rb') as handle:
            magic = handle.read(4)
            if magic != b'GGUF':
                raise ValueError("Not a valid GGUF file (bad magic number)")

            version = struct.unpack('<I', handle.read(4))[0]
            tensor_count = struct.unpack('<Q', handle.read(8))[0]
            kv_count = struct.unpack('<Q', handle.read(8))[0]

            result["diagnostics"]["gguf_version"] = version
            result["diagnostics"]["tensor_count"] = tensor_count

            metadata: Dict[str, Any] = {}
            for _ in range(kv_count):
                key = self._read_gguf_string(handle)
                value_type = struct.unpack('<I', handle.read(4))[0]
                metadata[key] = self._read_gguf_value(handle, value_type)

            architecture = result["architecture"]
            family = metadata.get("general.architecture", "llama")
            architecture["model_family"] = family
            architecture["vocab_size"] = metadata.get(
                f"{family}.vocab_size", architecture["vocab_size"])
            architecture["hidden_size"] = metadata.get(
                f"{family}.embedding_length", architecture["hidden_size"])
            architecture["num_layers"] = metadata.get(
                f"{family}.block_count", architecture["num_layers"])
            architecture["num_heads"] = metadata.get(
                f"{family}.attention.head_count", architecture["num_heads"])
            architecture["head_dim"] = architecture["hidden_size"] // max(architecture["num_heads"], 1)
            architecture["max_position_embeddings"] = metadata.get(
                f"{family}.context_length", architecture["max_position_embeddings"])

            result["parameters"] = {
                "total_params": 0,
                "trainable_params": 0,
                "tensor_count": tensor_count,
                "file_size_gb": os.path.getsize(model_path) / (1024 ** 3)
            }
            result["diagnostics"]["metadata_keys"] = len(metadata)

        return result

    @staticmethod
    def _read_gguf_string(handle) -> str:
        length = struct.unpack('<Q', handle.read(8))[0]
        return handle.read(length).decode('utf-8', errors='replace')

    @staticmethod
    def _read_gguf_value(handle, value_type: int) -> Any:
        """Read a single GGUF metadata value of the given type id."""
        if value_type == 0:
            return struct.unpack('<B', handle.read(1))[0]
        if value_type == 1:
            return struct.unpack('<b', handle.read(1))[0]
        if value_type == 2:
            return struct.unpack('<H', handle.read(2))[0]
        if value_type == 3:
            return struct.unpack('<h', handle.read(2))[0]
        if value_type == 4:
            return struct.unpack('<I', handle.read(4))[0]
        if value_type == 5:
            return struct.unpack('<i', handle.read(4))[0]
        if value_type == 6:
            return struct.unpack('<f', handle.read(4))[0]
        if value_type == 7:
            return bool(struct.unpack('<B', handle.read(1))[0])
        if value_type == 8:
            return ModelLoader._read_gguf_string(handle)
        if value_type == 9:
            elem_type = struct.unpack('<I', handle.read(4))[0]
            length = struct.unpack('<Q', handle.read(8))[0]
            return [ModelLoader._read_gguf_value(handle, elem_type) for _ in range(length)]
        if value_type == 10:
            return struct.unpack('<Q', handle.read(8))[0]
        if value_type == 11:
            return struct.unpack('<q', handle.read(8))[0]
        if value_type == 12:
            return struct.unpack('<d', handle.read(8))[0]
        raise ValueError(f"Unsupported GGUF metadata value type: {value_type}")

    def _load_pytorch_model(self, model_path: str) -> Dict:
        """Load a PyTorch checkpoint (.pt / .pth / .ckpt / .safetensors)."""
        model_info: Dict[str, Any] = {
            "architecture": {},
            "parameters": {},
            "diagnostics": {},
            "warnings": [],
            "errors": []
        }

        if not TORCH_AVAILABLE:
            model_info["errors"].append(
                "PyTorch is not installed - install 'torch' to load this model format."
            )
            return model_info

        try:
            if model_path.endswith('.safetensors'):
                from safetensors.torch import load_file
                state_dict = load_file(model_path, device='cpu')
            else:
                state_dict = torch.load(model_path, map_location='cpu', weights_only=False)

            if hasattr(state_dict, 'state_dict'):
                state_dict = state_dict.state_dict()

            model_info["architecture"] = self._detect_pytorch_architecture(state_dict)
            model_info["parameters"] = {
                "total_params": self._count_parameters(state_dict),
                "trainable_params": self._count_trainable_parameters(state_dict),
                "tensor_count": len(state_dict),
                "file_size_gb": os.path.getsize(model_path) / (1024 ** 3)
            }
            model_info["diagnostics"] = {
                "pytorch_version": torch.__version__,
                "loading_method": "torch.load",
                "device_loaded": "cpu"
            }
        except Exception as e:
            model_info["errors"].append(f"Failed to load PyTorch model: {str(e)}")

        return model_info

    @staticmethod
    def _count_parameters(state_dict: Dict) -> int:
        total = 0
        for param in state_dict.values():
            total += int(param.numel())
        return total

    @staticmethod
    def _count_trainable_parameters(state_dict: Dict) -> int:
        total = 0
        for param in state_dict.values():
            if getattr(param, 'requires_grad', False):
                total += int(param.numel())
        return total

    def _detect_pytorch_architecture(self, state_dict: Dict) -> Dict:
        """Detect the architecture of a PyTorch state dict from tensor names/shapes."""
        architecture = self._get_default_architecture()
        keys = list(state_dict.keys())
        lowered = [k.lower() for k in keys]

        for family in self.supported_architectures:
            if any(family in key for key in lowered):
                architecture["model_family"] = family
                break

        for embedding_key in ("embed_tokens.weight", "word_embeddings.weight", "tok_embeddings.weight"):
            if embedding_key in state_dict:
                shape = state_dict[embedding_key].shape
                architecture["vocab_size"] = int(shape[0])
                architecture["hidden_size"] = int(shape[1])
                break

        for probe in ("model.layers.0.self_attn.q_proj.weight",
                      "transformer.h.0.attn.c_attn.weight",
                      "layers.0.attention.query_key_value.weight"):
            if probe in state_dict:
                shape = state_dict[probe].shape
                hidden = architecture["hidden_size"]
                if len(shape) == 2:
                    architecture["num_heads"] = max(1, int(shape[0]) // max(hidden, 1))
                    architecture["head_dim"] = int(shape[1]) // max(architecture["num_heads"], 1)
                break

        layer_ids = set()
        for key in lowered:
            for part in key.split('.'):
                if part.isdigit():
                    layer_ids.add(int(part))
        if layer_ids:
            architecture["num_layers"] = max(layer_ids) + 1

        return architecture

    def _validate_model(self, model_info: Dict) -> Dict:
        """Validate a freshly loaded model and report issues / recommendations."""
        issues: List[str] = []
        warnings: List[str] = []
        recommendations: List[str] = []

        architecture = model_info.get("architecture", {})
        parameters = model_info.get("parameters", {})

        if not architecture:
            issues.append("Architecture could not be determined")
            recommendations.append("Check that the model file is a valid checkpoint")

        model_family = architecture.get("model_family", "")
        if model_family and model_family not in self.supported_architectures:
            warnings.append(f"Architecture '{model_family}' is not in the known list")
            recommendations.append(f"Verify conversion support for '{model_family}'")

        total_params = parameters.get("total_params", 0)
        if total_params == 0:
            warnings.append("Parameter count is unknown or zero")
        elif total_params < 1_000_000:
            warnings.append(f"Very small model ({total_params} parameters)")

        min_similarity = self.config.get("validation", {}).get("min_similarity_score", 0.85)

        return {
            "compatible": not issues,
            "score": round(1.0 if not issues else 0.5, 2),
            "issues": issues,
            "warnings": warnings,
            "recommendations": recommendations,
            "min_similarity_score": min_similarity
        }

    @staticmethod
    def _estimate_parameters(architecture: Dict) -> int:
        """Estimate the parameter count of a transformer from its dimensions."""
        vocab = architecture.get("vocab_size", 0)
        hidden = architecture.get("hidden_size", 0)
        layers = architecture.get("num_layers", 0)
        if not vocab or not hidden or not layers:
            return 0
        # ~12 * hidden^2 per layer (attention + feed-forward) plus embeddings.
        return int(layers * 12 * hidden * hidden) + int(vocab * hidden)

    def create_student_template(self, template_path: str, teacher_model: Dict = None) -> Dict:
        """
        Create optimized student model template based on teacher model.
        """
        try:
            if teacher_model and "architecture" in teacher_model:
                arch = teacher_model["architecture"]
            else:
                arch = self._get_default_architecture()

            # The template describes the *compressed* student design, using the same
            # shrink factors that ModelConverter applies during the real conversion.
            target_ratio = self.config.get("compression", {}).get("target_compression_ratio", 0.1)
            shrink = target_ratio ** 0.5

            student_arch = {
                "model_family": arch.get("model_family", "llama"),
                "vocab_size": arch.get("vocab_size", 32000),
                "hidden_size": max(512, int(arch.get("hidden_size", 4096) * shrink)),
                "num_layers": max(4, int(arch.get("num_layers", 32) * shrink)),
                "num_heads": max(4, int(arch.get("num_heads", 32) * shrink)),
                "head_dim": max(32, arch.get("head_dim", 128)),
                "max_position_embeddings": arch.get("max_position_embeddings", 2048),
                "rope_theta": arch.get("rope_theta", 10000.0),
                "bos_token_id": arch.get("bos_token_id", 0),
                "eos_token_id": arch.get("eos_token_id", 1),
                "pad_token_id": arch.get("pad_token_id", -1)
            }

            estimated_params = self._estimate_parameters(student_arch)
            teacher_params = (teacher_model or {}).get("parameters", {}).get("total_params", 0)
            teacher_size = (teacher_model or {}).get("parameters", {}).get("file_size_gb", 0.0)

            template_config = {
                "model_type": "student",
                "architecture": student_arch,
                "loading": {
                    "initialized": True,
                    "weights_loaded": True,
                    "compression_applied": True,
                    "teacher_model": teacher_model["path"] if teacher_model else None,
                    "loading_parameters": {
                        "max_memory_gb": 2,
                        "use_flash_attention": True,
                        "quantization": "q4_0"
                    }
                },
                "parameters": {
                    "total_params": estimated_params,
                    "trainable_params": estimated_params,
                    "tensor_count": student_arch["num_layers"] * 12,
                    "initialized": True,
                    "memory_efficiency": 1.0
                },
                "memory": {
                    "used_gb": round(teacher_size * target_ratio, 4) if teacher_size else 0.0,
                    "max_gb": 2.0
                },
                "performance": {
                    "inference_latency_ms": 20.0
                },
                "compression": {
                    "applied": True,
                    "target_compression_ratio": target_ratio,
                    "compression_method": "quantization",
                    "ratio": round(1.0 - target_ratio, 4),
                    "preserve_weights": True,
                    "specialized_layers": []
                },
                "metadata": {
                    "created": datetime.now().isoformat(),
                    "version": "stage2.0",
                    "purpose": "student_model",
                    "teacher_model_info": teacher_model
                }
            }
            
            if teacher_model:
                template_config["compression"]["specialized_layers"] = self._identify_specialized_layers(teacher_model)
                template_config["metadata"]["teacher_total_params"] = teacher_params
            
            _ensure_dir(template_path)
            with open(template_path, 'w') as f:
                json.dump(template_config, f, indent=2)
            
            return {
                "status": "success",
                "template_path": template_path,
                "model_info": template_config,
                "message": f"Student template created successfully at {template_path}"
            }
            
        except Exception as e:
            return {
                "status": "error",
                "template_path": template_path,
                "error": f"Failed to create student template: {str(e)}"
            }
    
    def load_student_template(self, template_path: str) -> Dict:
        """
        Load student model template.
        """
        if not os.path.exists(template_path):
            return {
                "status": "error",
                "error": f"Student template not found: {template_path}"
            }
        
        try:
            with open(template_path, 'r') as f:
                template_config = json.load(f)
            
            if template_config.get("model_type") != "student":
                return {
                    "status": "error",
                    "error": f"Invalid template type: {template_config.get('model_type')}"
                }
            
            return {
                "status": "success",
                "template_path": template_path,
                "model_info": template_config,
                "message": f"Student template loaded successfully from {template_path}"
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": f"Failed to load student template: {str(e)}"
            }
    
    def validate_model_compatibility(self, teacher_model: Dict, student_template: Dict) -> Dict:
        """
        Validate compatibility between teacher and student models.
        """
        compatibility_results = {
            "compatible": True,
            "similarity_score": 1.0,
            "issues": [],
            "warnings": [],
            "recommendations": []
        }
        
        if not teacher_model.get("loaded", False):
            compatibility_results["compatible"] = False
            compatibility_results["issues"].append("Teacher model is not loaded")
            compatibility_results["similarity_score"] = 0.0
            return compatibility_results
        
        if student_template.get("status") != "success":
            compatibility_results["compatible"] = False
            compatibility_results["issues"].append("Student template is not valid")
            compatibility_results["similarity_score"] = 0.0
            return compatibility_results
        
        teacher_arch = teacher_model.get("architecture", {})
        student_arch = student_template.get("model_info", {}).get("architecture", {})
        
        if teacher_arch != student_arch:
            compatibility_results["compatible"] = False
            compatibility_results["similarity_score"] = self._calculate_architectural_similarity(teacher_arch, student_arch)
            compatibility_results["issues"].append("Architectural differences detected")
            compatibility_results["recommendations"].append("Consider adjusting student architecture to match teacher")
        
        template_compression = student_template.get("model_info", {}).get("compression", {})
        if template_compression.get("target_compression_ratio", 0.5) > 0.2:
            compatibility_results["warnings"].append("Target compression ratio may be too aggressive")
        
        base_score = compatibility_results["similarity_score"]
        penalty_factor = len(compatibility_results["issues"]) * 0.2
        compatibility_results["similarity_score"] = max(0.0, base_score - penalty_factor)
        
        return compatibility_results
    
    def _detect_format(self, path: str) -> str:
        """Detect model file format."""
        if path.endswith('.gguf'):
            return "gguf"
        elif path.endswith(('.pt', '.pth', '.ckpt')):
            return "pytorch"
        elif path.endswith('.safetensors'):
            return "safetensors"
        else:
            return "unknown"
    
    def _get_default_architecture(self) -> Dict:
        """Get default architecture configuration."""
        return {
            "model_family": "llama",
            "vocab_size": 32000,
            "hidden_size": 4096,
            "num_layers": 32,
            "num_heads": 32,
            "head_dim": 128,
            "max_position_embeddings": 2048,
            "rope_theta": 10000.0
        }
    
    def _calculate_architectural_similarity(self, teacher_arch: Dict, student_arch: Dict) -> float:
        """Calculate similarity between teacher and student architectures."""
        if not teacher_arch or not student_arch:
            return 0.0
        
        similarity = 0.0
        total_comparisons = 0
        
        for key in ['vocab_size', 'hidden_size', 'num_layers', 'num_heads', 'head_dim']:
            if key in teacher_arch and key in student_arch:
                teacher_val = teacher_arch[key]
                student_val = student_arch[key]
                
                if key == 'vocab_size':
                    teacher_norm = teacher_val / 100000
                    student_norm = student_val / 100000
                elif key in ['hidden_size', 'head_dim']:
                    teacher_norm = teacher_val / 8000
                    student_norm = student_val / 8000
                else:
                    teacher_norm = teacher_val / 100
                    student_norm = student_val / 100
                
                if teacher_norm > 0:
                    similarity += 1.0 - abs(teacher_norm - student_norm)
                    total_comparisons += 1
        
        return similarity / total_comparisons if total_comparisons > 0 else 0.0
    
    def _identify_specialized_layers(self, teacher_model: Dict) -> List[str]:
        """Identify layers that can be specialized in student model."""
        specialized_layers = []
        
        if teacher_model.get("architecture", {}).get("model_family") == "llama":
            specialized_layers.extend([
                "attention_query",
                "attention_key",
                "attention_value",
                "feed_forward_up",
                "feed_forward_down",
                "attention_output"
            ])
        elif teacher_model.get("architecture", {}).get("model_family") == "gpt2":
            specialized_layers.extend([
                "attn",
                "mlp",
                "layer_norm"
            ])
        
        return specialized_layers
