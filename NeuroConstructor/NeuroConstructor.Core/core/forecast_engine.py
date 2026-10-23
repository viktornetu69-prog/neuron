"""
Stage 6: Forecast Engine - Predictive Scaling & Resource Estimation
Компонент: 🔮 Система прогнозирования нагрузки и автоматического масштабирования
"""

import time
import logging
from typing import Dict, List, Any, Optional, Tuple
from collections import deque

logger = logging.getLogger(__name__)

DEFAULT_LOOKBACK_WINDOW = 60
DEFAULT_FORECAST_HORIZON = 30
SCALING_THRESHOLD_HIGH = 0.8
SCALING_THRESHOLD_LOW = 0.2
MEMORY_SAFETY_FACTOR = 1.2


class ForecastEngine:
    """Движок прогнозирования и автоматического масштабирования"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.metrics_history: deque = deque(maxlen=DEFAULT_LOOKBACK_WINDOW)
        self.forecast_cache: Dict[str, Any] = {}
        self.last_forecast_time: Optional[float] = None
        self.is_running: bool = False
        self.scaling_enabled: bool = self.config.get("scaling_enabled", True)
        
        logger.info("ForecastEngine initialized")
    
    def record_metrics(self, metrics: Dict[str, Any]) -> None:
        """Запись метрик в историю для прогнозирования"""
        entry = {
            "timestamp": time.time(),
            "cpu_usage": metrics.get("cpu_usage", 0.0),
            "memory_usage": metrics.get("memory_usage", 0.0),
            "disk_usage": metrics.get("disk_usage", 0.0),
            "network_io": metrics.get("network_io", 0.0),
            "active_connections": metrics.get("active_connections", 0),
            "execution_time": metrics.get("execution_time", 0.0),
            "throughput": metrics.get("throughput", 0.0),
        }
        self.metrics_history.append(entry)
        logger.debug(f"Metrics recorded: {entry}")
    
    def predict_load(self, forecast_horizon: int = DEFAULT_FORECAST_HORIZON) -> Dict[str, Any]:
        """Прогнозирование нагрузки на основе исторических метрик"""
        if len(self.metrics_history) < 5:
            return {
                "predicted_cpu": 0.5,
                "predicted_memory": 0.6,
                "predicted_disk": 0.3,
                "predicted_network": 0.2,
                "confidence": 0.0,
                "trend": "unknown",
            }
        
        recent = list(self.metrics_history)[-5:]
        avg_cpu = sum(m.get("cpu_usage", 0.0) for m in recent) / len(recent)
        avg_memory = sum(m.get("memory_usage", 0.0) for m in recent) / len(recent)
        
        cpu_values = [m.get("cpu_usage", 0.0) for m in recent]
        if len(cpu_values) > 1:
            trend = "increasing" if cpu_values[-1] > cpu_values[0] else "decreasing" if cpu_values[-1] < cpu_values[0] else "stable"
        else:
            trend = "stable"
        
        multiplier = {"increasing": 1.2, "decreasing": 0.8, "stable": 1.0}[trend]
        predicted_cpu = min(avg_cpu * multiplier, 1.0)
        predicted_memory = min(avg_memory * multiplier, 1.0)
        
        confidence = min(len(self.metrics_history) / 10.0, 1.0)
        
        return {
            "predicted_cpu": round(predicted_cpu, 2),
            "predicted_memory": round(predicted_memory, 2),
            "predicted_disk": 0.3,
            "predicted_network": 0.2,
            "confidence": round(confidence, 2),
            "trend": trend,
            "forecast_horizon_minutes": forecast_horizon,
            "forecast_time": time.time(),
        }
    
    def estimate_resources(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Оценка необходимых ресурсов для выполнения задачи"""
        task_type = task.get("type", "general")
        complexity = task.get("complexity", 0.5)
        estimated_duration = task.get("estimated_duration", 60.0)
        
        base_cpu = {"general": 0.5, "model_inference": 0.7, "training": 0.8, "testing": 0.6}.get(task_type, 0.5)
        base_memory = {"general": 0.5, "model_inference": 0.6, "training": 1.0, "testing": 0.7}.get(task_type, 0.5)
        base_duration = {"general": 30.0, "model_inference": 60.0, "training": 300.0, "testing": 120.0}.get(task_type, 30.0)
        
        cpu_required = min(base_cpu * (0.5 + complexity), 1.0) * MEMORY_SAFETY_FACTOR
        memory_required = min(base_memory * (0.5 + complexity), 1.0) * MEMORY_SAFETY_FACTOR
        estimated_duration = base_duration * (0.5 + complexity)
        
        priority = "high" if complexity > 0.8 else "normal" if complexity > 0.4 else "low"
        
        return {
            "cpu_required": round(cpu_required, 2),
            "memory_required": round(memory_required, 2),
            "disk_required": 1.0,
            "network_required": 0.5,
            "estimated_duration": round(estimated_duration, 1),
            "priority": priority,
            "task_type": task_type,
            "complexity": complexity,
        }
    
    def should_scale(self, current_metrics: Dict[str, Any], forecast: Optional[Dict[str, Any]] = None) -> bool:
        """Решение о масштабировании на основе текущих метрик и прогноза"""
        if not self.scaling_enabled:
            return False
        
        if forecast is None:
            forecast = self.predict_load()
        
        if current_metrics.get("cpu_usage", 0.0) > SCALING_THRESHOLD_HIGH or forecast.get("predicted_cpu", 0.0) > SCALING_THRESHOLD_HIGH:
            logger.info("Scaling up: high load detected")
            return True
        
        if current_metrics.get("cpu_usage", 0.0) < SCALING_THRESHOLD_LOW and forecast.get("predicted_cpu", 0.0) < SCALING_THRESHOLD_LOW:
            logger.info("Scaling down: low load detected")
            return True
        
        return False
    
    def get_forecast_summary(self) -> Dict[str, Any]:
        """Получение сводки прогнозов за последнее время"""
        current_forecast = self.predict_load()
        return {
            **current_forecast,
            "history_size": len(self.metrics_history),
            "last_forecast_time": self.last_forecast_time,
            "cache": self.forecast_cache,
        }
    
    def start(self) -> None:
        """Запуск фонового прогнозирования"""
        self.is_running = True
        logger.info("ForecastEngine started")
    
    def stop(self) -> None:
        """Остановка фонового прогнозирования"""
        self.is_running = False
        logger.info("ForecastEngine stopped")


if __name__ == "__main__":
    fe = ForecastEngine({"scaling_enabled": True})
    fe.record_metrics({"cpu_usage": 0.3, "memory_usage": 0.4, "disk_usage": 0.2})
    fe.record_metrics({"cpu_usage": 0.4, "memory_usage": 0.5, "disk_usage": 0.2})
    forecast = fe.predict_load()
    print(f"Forecast: {forecast}")
    task = {"type": "model_inference", "complexity": 0.7, "estimated_duration": 120}
    estimate = fe.estimate_resources(task)
    print(f"Resource estimate: {estimate}")
    should_scale = fe.should_scale({"cpu_usage": 0.9}, forecast)
    print(f"Should scale: {should_scale}")