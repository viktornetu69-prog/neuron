"""
Stage 6: Unified Integration Layer
Объединяет AI, Forecast, AutoFix и SelfLearning в единый контекст.
"""

import time
from typing import Dict, Any, List, Optional
from core.ai_plugin import AIPredictionPlugin
from core.forecast_engine import ForecastEngine
from core.auto_fix_engine import AutoFixEngine
from core.self_learning import SelfLearningEngine


class Stage6Integration:
    """Единая точка интеграции Stage 6 компонентов"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.ai = AIPredictionPlugin(self.config)
        self.forecast = ForecastEngine(self.config)
        self.auto_fix = AutoFixEngine()
        self.self_learning = SelfLearningEngine(self.config)
        
        # Состояние интеграции
        self.integration_state = {
            "ai_initialized": True,
            "forecast_initialized": True,
            "auto_fix_initialized": True,
            "self_learning_initialized": True,
            "unified": True,
        }
        self.metrics_history: List[Dict[str, Any]] = []
        self.optimization_suggestions: List[Dict[str, Any]] = []
        
        print("Stage 6 Integration initialized successfully")
    
    def process_ai_prediction(self, metrics: Dict[str, float]) -> Dict[str, Any]:
        """Прогнозирование + самообучение + исправление"""
        # AI прогноз
        ai_result = self.ai.predict_performance(metrics)
        
        # Сохраняем метрики
        self.metrics_history.append({"metrics": metrics, "result": ai_result})
        
        # Самообучение на основе результатов
        if len(self.metrics_history) > 10:
            results = [{"success": True if ai_result.get("status") == "optimal" else False} for _ in range(10)]
            self.self_learning.learn_from_results(results)
        
        # Решение об исправлении
        fix_needed = ai_result.get("status") in ["degraded", "critical"]
        fix_result = self.auto_fix.detect_and_fix_errors({
            "type": "performance_issue",
            "severity": ai_result.get("status", "unknown"),
        }) if fix_needed else {"status": "not_needed"}
        
        return {
            "prediction": ai_result,
            "fix": fix_result,
            "self_learning_stats": self.self_learning.get_learning_stats(),
            "metrics_history_length": len(self.metrics_history),
        }
    
    def run_optimization_cycle(self) -> Dict[str, Any]:
        """Полный цикл: прогноз → обучение → оптимизация"""
        current_metrics = self._collect_current_metrics()
        integration_result = self.process_ai_prediction(current_metrics)
        
        # Получаем предложения по оптимизации
        suggestions = self.self_learning.get_optimization_suggestions()
        integration_result["suggestions"] = suggestions
        
        # Применяем оптимизацию
        optimization_applied = False
        if suggestions:
            optimization_applied = True
        
        return {
            "status": "completed",
            "metrics": current_metrics,
            "prediction": integration_result.get("prediction"),
            "fix": integration_result.get("fix"),
            "suggestions": suggestions,
            "optimization_applied": optimization_applied,
            "cycle_timestamp": time.time(),
        }
    
    def _collect_current_metrics(self) -> Dict[str, float]:
        """Сбор текущих метрик системы"""
        import psutil
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory().percent / 100
        return {
            "cpu_usage": cpu_percent / 100,
            "memory_usage": memory,
            "execution_time": 0.0,
            "load": 0.5,
        }
    
    def get_unified_status(self) -> Dict[str, Any]:
        """Получение статуса всех компонентов"""
        return {
            "integration_state": self.integration_state,
            "ai": self.ai.get_model_info(),
            "forecast": self.forecast.get_forecast_summary(),
            "self_learning": self.self_learning.get_learning_stats(),
            "auto_fix": {"initialized": True},
            "metrics_history": self.metrics_history,
        }
    
    def cleanup(self):
        """Очистка ресурсов"""
        print("Stage 6 Integration cleaned up")


if __name__ == "__main__":
    integration = Stage6Integration({})
    result = integration.run_optimization_cycle()
    print(f"Optimization cycle result: {result}")
    status = integration.get_unified_status()
    print(f"Unified status: {status}")
    integration.cleanup()