"""
Stage 2: Quality Assurance Module
Student-Teacher Architecture - Model quality validation and analysis.
"""

import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime

# Optional dependency - numpy is only used for optional numeric comparisons.
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:  # pragma: no cover - depends on environment
    np = None
    NUMPY_AVAILABLE = False


class QualityAssurance:
    """
    Core quality assurance functionality for Stage 2.
    Implements model quality validation and improvement strategies.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "..", "config", "quality_config.json"
        )
        self.config = self._load_config()
        self.quality_thresholds = {
            "architectural_similarity": 0.85,
            "compression_quality": 0.9,
            "functional_consistency": 0.8,
            "parameter_integrity": 0.9,
            "memory_efficiency": 0.85,
            "performance": 0.9
        }
    
    def _load_config(self, config_path: Optional[str] = None) -> Dict:
        """Load quality assurance configuration."""
        config_path = config_path or self.config_path
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                return json.load(f)
        else:
            return {
                "quality_thresholds": {
                    "architectural_similarity": 0.85,
                    "compression_quality": 0.9,
                    "functional_consistency": 0.8,
                    "parameter_integrity": 0.9,
                    "memory_efficiency": 0.85,
                    "performance": 0.9
                },
                "validation": {
                    "min_quality_score": 0.85,
                    "max_issues_allowed": 5
                },
                "improvement": {
                    "enable_automated_improvement": True,
                    "max_iterations": 3,
                    "target_quality_score": 0.95
                }
            }
    
    def validate_model_quality(self, model_info: Dict, teacher_model: Dict = None) -> Dict:
        """
        Validate quality of student model after conversion.
        
        Args:
            model_info: Student model information
            teacher_model: Original teacher model information
            
        Returns:
            Dictionary with quality validation results
        """
        quality_results = {
            "quality_score": 0.0,
            "is_valid": False,
            "metrics": {},
            "issues": [],
            "recommendations": [],
            "validation_timestamp": datetime.now().isoformat()
        }
        
        # Calculate quality metrics
        quality_metrics = self._calculate_quality_metrics(model_info, teacher_model)
        quality_results["metrics"] = quality_metrics
        
        # Calculate overall quality score
        quality_score = self._calculate_overall_quality_score(quality_metrics)
        quality_results["quality_score"] = quality_score
        
        # Check if model meets quality thresholds
        is_valid = quality_score >= self.config["validation"]["min_quality_score"]
        quality_results["is_valid"] = is_valid
        
        # Collect issues and recommendations
        issues = self._identify_quality_issues(quality_metrics, is_valid)
        recommendations = self._generate_recommendations(quality_metrics, is_valid)
        
        quality_results["issues"] = issues
        quality_results["recommendations"] = recommendations
        
        return quality_results
    
    def _calculate_quality_metrics(self, model_info: Dict, teacher_model: Dict = None) -> Dict:
        """Calculate comprehensive quality metrics for model."""
        metrics = {
            "architectural_similarity": self._calculate_architectural_similarity(
                teacher_model["architecture"] if teacher_model else {},
                model_info.get("architecture", {})
            ),
            "compression_quality": self._calculate_compression_quality(model_info),
            "functional_consistency": self._calculate_functional_consistency(
                model_info, teacher_model
            ),
            "parameter_integrity": self._calculate_parameter_integrity(model_info),
            "memory_efficiency": self._calculate_memory_efficiency(model_info),
            "performance": self._calculate_performance_score(model_info)
        }
        
        # Calculate overall quality score (weighted)
        weights = {
            "architectural_similarity": 0.25,
            "compression_quality": 0.20,
            "functional_consistency": 0.20,
            "parameter_integrity": 0.15,
            "memory_efficiency": 0.10,
            "performance": 0.10
        }
        
        quality_score = sum(
            metrics[key] * weights[key] for key in metrics
        ) / sum(weights.values())
        
        metrics["overall_quality_score"] = round(quality_score, 2)
        
        return metrics
    
    def _calculate_architectural_similarity(self, teacher_arch: Dict, student_arch: Dict) -> float:
        """Calculate architectural similarity between teacher and student."""
        if not teacher_arch or not student_arch:
            return 0.0
        
        similarity = 0.0
        comparisons = 0
        
        for key in ['vocab_size', 'hidden_size', 'num_layers', 'num_heads', 'head_dim']:
            if key in teacher_arch and key in student_arch:
                teacher_val = teacher_arch[key]
                student_val = student_arch[key]
                
                # Normalize values (0-1 scale)
                if key == 'vocab_size':
                    teacher_norm = min(teacher_val / 100000, 1.0)
                    student_norm = min(student_val / 100000, 1.0)
                elif key == 'hidden_size':
                    teacher_norm = min(teacher_val / 8000, 1.0)
                    student_norm = min(student_val / 8000, 1.0)
                elif key in ['num_layers', 'num_heads']:
                    teacher_norm = min(teacher_val / 100, 1.0)
                    student_norm = min(student_val / 100, 1.0)
                else:  # head_dim
                    teacher_norm = min(teacher_val / 128, 1.0)
                    student_norm = min(student_val / 128, 1.0)
                
                if teacher_norm > 0:
                    similarity += 1.0 - abs(teacher_norm - student_norm)
                    comparisons += 1
        
        return similarity / comparisons if comparisons > 0 else 0.0
    
    def _calculate_compression_quality(self, model_info: Dict) -> float:
        """Calculate quality of compression applied to model."""
        compression = model_info.get("compression", {})
        compression_applied = compression.get("applied", False)
        compression_method = compression.get("method", compression.get("compression_method", "none"))
        # `ratio` is the fraction of the teacher size that is RETAINED
        # (0.1 == a 10x smaller student).
        compression_ratio = compression.get("ratio", 0.0)
        
        if not compression_applied:
            return 0.0
        
        # Quality based on method
        if compression_method == "quantization":
            base_quality = 0.9
        elif compression_method == "pruning":
            base_quality = 0.85
        elif compression_method == "distillation":
            base_quality = 0.95
        else:
            base_quality = 0.8
        
        # Quality based on the retained fraction
        if compression_ratio > 0 and compression_ratio < 0.05:
            base_quality *= 0.85  # Over-compressed
        elif compression_ratio > 0.5:
            base_quality *= 0.9   # Barely compressed
        
        # Quality based on specialized layers
        specialized_count = len(compression.get("specialized_layers", []))
        if specialized_count > 0:
            base_quality *= 1.05  # Bonus for specialization
        
        return round(min(1.0, base_quality), 2)
    
    def _calculate_functional_consistency(self, model_info: Dict, teacher_model: Dict = None) -> float:
        """Calculate functional consistency between teacher and student."""
        if not teacher_model:
            return 0.0
        
        # Base on architectural similarity
        arch_sim = self._calculate_architectural_similarity(
            teacher_model.get("architecture", {}),
            model_info.get("architecture", {})
        )
        
        # Check if compression preserved functionality
        compression = model_info.get("compression", {})
        preserves_functionality = compression.get("preserve_weights", True)
        
        functionality_score = arch_sim * (0.9 if preserves_functionality else 0.6)
        
        return round(functionality_score, 2)
    
    def _calculate_parameter_integrity(self, model_info: Dict) -> float:
        """Calculate parameter integrity of student model."""
        parameters = model_info.get("parameters", {})
        integrity_score = 1.0
        
        # Check if parameters are properly initialized
        if not parameters.get("initialized", True):
            integrity_score *= 0.5
        
        # A model without any parameters is not usable
        total_params = parameters.get("total_params", 0)
        if total_params <= 0:
            integrity_score *= 0.5
        
        # Check memory efficiency
        memory_efficiency = parameters.get("memory_efficiency", 1.0)
        integrity_score *= memory_efficiency
        
        return round(min(1.0, integrity_score), 2)
    
    def _calculate_memory_efficiency(self, model_info: Dict) -> float:
        """Calculate memory efficiency of student model."""
        memory = model_info.get("memory", {})
        memory_used = memory.get("used_gb", 0.0)
        max_memory = memory.get("max_gb", 4.0)
        
        if max_memory > 0:
            efficiency = min(1.0, (max_memory - memory_used) / max_memory)
            return round(efficiency, 2)
        return 0.8
    
    def _calculate_performance_score(self, model_info: Dict) -> float:
        """Calculate performance score of student model."""
        performance = model_info.get("performance", {})
        latency = performance.get("inference_latency_ms", 50.0)
        
        # Anything at or below the 50 ms reference budget is considered optimal.
        if latency <= 50.0:
            return 1.0
        
        score = max(0.0, 1.0 - ((latency - 50.0) / 100.0))
        return round(score, 2)
    
    def _calculate_overall_quality_score(self, metrics: Dict) -> float:
        """Calculate overall quality score from metrics."""
        weights = self.config.get("weights", {
            "architectural_similarity": 0.25,
            "compression_quality": 0.20,
            "functional_consistency": 0.20,
            "parameter_integrity": 0.15,
            "memory_efficiency": 0.10,
            "performance": 0.10
        })
        
        quality_score = sum(
            metrics.get(key, 0.0) * weight for key, weight in weights.items()
        ) / sum(weights.values())
        
        return round(min(1.0, quality_score), 2)
    
    def _identify_quality_issues(self, metrics: Dict, is_valid: bool) -> List[str]:
        """Identify quality issues based on metrics."""
        issues = []
        
        if metrics.get("architectural_similarity", 0.0) < self.quality_thresholds["architectural_similarity"]:
            issues.append("Architectural similarity below threshold")
        
        if metrics.get("compression_quality", 0.0) < self.quality_thresholds["compression_quality"]:
            issues.append("Compression quality below threshold")
        
        if metrics.get("functional_consistency", 0.0) < self.quality_thresholds["functional_consistency"]:
            issues.append("Functional consistency below threshold")
        
        if metrics.get("parameter_integrity", 0.0) < self.quality_thresholds["parameter_integrity"]:
            issues.append("Parameter integrity compromised")
        
        if metrics.get("memory_efficiency", 0.0) < self.quality_thresholds["memory_efficiency"]:
            issues.append("Memory efficiency below threshold")
        
        if metrics.get("performance", 0.0) < self.quality_thresholds["performance"]:
            issues.append("Performance below threshold")
        
        # Add general issues if invalid
        if not is_valid:
            issues.append("Overall quality score below minimum threshold")
        
        return issues
    
    def _generate_recommendations(self, metrics: Dict, is_valid: bool) -> List[str]:
        """Generate recommendations based on quality analysis."""
        recommendations = []
        
        if metrics.get("architectural_similarity", 0.0) < 0.85:
            recommendations.append("Consider adjusting student architecture for better similarity")
        
        if metrics.get("compression_quality", 0.0) < 0.9:
            recommendations.append("Review compression parameters for better quality")
        
        if metrics.get("functional_consistency", 0.0) < 0.8:
            recommendations.append("Implement additional training for functional consistency")
        
        if not is_valid:
            recommendations.append("Increase quality thresholds or improve conversion process")
        
        return recommendations
    
    def run_full_validation(self, teacher_model: Dict, student_model: Dict) -> Dict:
        """Run full validation between teacher and student models."""
        # The student model may be passed as a raw model info dict or wrapped in
        # the result envelope produced by `ModelLoader.load_student_template`.
        student_info = student_model.get("model_info", student_model) if isinstance(student_model, dict) else {}

        validation_results = {
            "teacher": {
                "quality_score": self._calculate_overall_quality_score(
                    self._calculate_quality_metrics(teacher_model)
                ) if teacher_model.get("loaded", False) else 0.0,
                "is_valid": teacher_model.get("loaded", False),
                "architecture": teacher_model.get("architecture", {})
            },
            "compatibility": 0.0,
            "student": {
                "quality_score": 0.0,
                "is_valid": False,
                "architecture": student_info.get("architecture", {})
            },
            "overall_valid": True,
            "issues": [],
            "timestamp": datetime.now().isoformat()
        }
        
        student_quality = self.validate_model_quality(student_info, teacher_model)
        validation_results["student"] = student_quality
        
        compatibility_score = self._calculate_compatibility_score(teacher_model, student_info)
        validation_results["compatibility"] = compatibility_score
        
        validation_results["overall_valid"] = (
            student_quality["is_valid"] and 
            compatibility_score >= self.config.get("validation", {}).get("min_quality_score", 0.85)
        )
        
        validation_results["issues"] = student_quality.get("issues", [])
        
        return validation_results
    
    def _calculate_compatibility_score(self, teacher_model: Dict, student_model: Dict) -> float:
        teacher_arch = teacher_model.get("architecture", {})
        student_arch = student_model.get("architecture", {})
        
        if not teacher_arch or not student_arch:
            return 0.0
        
        arch_similarity = self._calculate_architectural_similarity(teacher_arch, student_arch)
        
        return round(arch_similarity, 2)
    

if __name__ == "__main__":
    qa = QualityAssurance()
    print("Quality Assurance module initialized")
