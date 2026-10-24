"""
Stage 6: Self-Learning - Adaptive Optimization
Компонент: 🔄 Система самообучения и адаптивной оптимизации

Этот модуль реализует:
1. Обучение на основе результатов тестов/выполнения
2. Адаптивную настройку параметров системы
3. Самоулучшение алгоритмов на основе данных
"""

import time
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class SelfLearningEngine:
    """Движок самообучения и адаптивной оптимизации"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.learning_rate = self.config.get("learning_rate", 0.01)
        self.min_confidence = self.config.get("min_confidence", 0.7)
        self.optimization_history: List[Dict[str, Any]] = []
        self.adaptation_params: Dict[str, Any] = {}
        self.is_trained: bool = False
        
        logger.info("SelfLearningEngine initialized")
    
    def learn_from_results(self, results: List[Dict[str, Any]]) -> bool:
        """Обучение на основе результатов выполнения"""
        if not results:
            logger.warning("No results provided for learning")
            return False
        
        # Анализ результатов
        successes = sum(1 for r in results if r.get("success", False))
        success_rate = successes / len(results)
        
        logger.info(f"Learning from {len(results)} results, success rate: {success_rate}")
        
        # Адаптация параметров на основе успеха
        if success_rate > 0.8:
            self.adaptation_params["performance"] = "high"
            self.adaptation_params["optimization_level"] = "aggressive"
        elif success_rate > 0.5:
            self.adaptation_params["performance"] = "medium"
            self.adaptation_params["optimization_level"] = "moderate"
        else:
            self.adaptation_params["performance"] = "low"
            self.adaptation_params["optimization_level"] = "conservative"
        
        self.is_trained = True
        
        # Запись в историю
        self.optimization_history.append({
            "timestamp": time.time(),
            "type": "learn_from_results",
            "success_rate": success_rate,
            "adaptation_params": self.adaptation_params.copy(),
        })
        
        return True
    
    def adapt_parameters(self, performance_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Адаптация параметров системы на основе метрик"""
        current_perf = performance_metrics.get("performance", 0.0)
        
        if current_perf > self.min_confidence:
            # Высокая производительность - можно усилить оптимизацию
            adjustment = min(1.0, current_perf * self.learning_rate)
            self.adaptation_params["current_performance"] = current_perf
            self.adaptation_params["optimization_factor"] = adjustment
            
            return {
                "status": "enhanced",
                "optimization_factor": adjustment,
                "current_performance": current_perf,
            }
        else:
            # Низкая производительность - снижаем агрессию
            self.adaptation_params["current_performance"] = current_perf
            self.adaptation_params["optimization_factor"] = 0.0
            
            return {
                "status": "tuned",
                "optimization_factor": 0.0,
                "current_performance": current_perf,
            }
    
    def get_optimization_suggestions(self) -> List[Dict[str, Any]]:
        """Получение предложений по оптимизации"""
        suggestions = []
        
        if not self.is_trained:
            suggestions.append({
                "type": "training",
                "priority": "high",
                "description": "Train the system on historical data before optimization",
            })
        else:
            if self.adaptation_params.get("performance") == "low":
                suggestions.append({
                    "type": "optimization",
                    "priority": "high",
                    "description": "Increase optimization level due to low performance",
                })
            elif self.adaptation_params.get("performance") == "high":
                suggestions.append({
                    "type": "optimization",
                    "priority": "low",
                    "description": "System is performing well, consider scaling up",
                })
        
        return suggestions
    
    def get_learning_stats(self) -> Dict[str, Any]:
        """Получение статистики обучения"""
        return {
            "is_trained": self.is_trained,
            "learning_rate": self.learning_rate,
            "min_confidence": self.min_confidence,
            "adaptation_params": self.adaptation_params,
            "optimization_history_size": len(self.optimization_history),
        }


if __name__ == "__main__":
    se = SelfLearningEngine({"learning_rate": 0.01, "min_confidence": 0.7})
    
    results = [
        {"success": True, "performance": 0.9},
        {"success": True, "performance": 0.85},
        {"success": False, "performance": 0.5},
    ]
    learned = se.learn_from_results(results)
    print(f"Learned: {learned}")
    
    metrics = {"performance": 0.8}
    adapted = se.adapt_parameters(metrics)
    print(f"Adapted: {adapted}")
    
    suggestions = se.get_optimization_suggestions()
    print(f"Suggestions: {suggestions}")
    
    stats = se.get_learning_stats()
    print(f"Stats: {stats}")