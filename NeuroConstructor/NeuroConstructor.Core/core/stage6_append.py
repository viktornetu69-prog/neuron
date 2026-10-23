p = 'D:\\NeuralNet_for_GameDev\\NeuroConstructor\\NeuroConstructor.Core\\core\\engine.py'
with open(p, 'r', encoding='utf-8', newline='') as f:
    content = f.read()

if 'import json' not in content:
    content = content.replace('import os', 'import os\nimport json\nimport time', 1)

methods_text = '''
    # ===== Stage 6: Advanced Functions via Unified Plugin =====

    def Stage6AI(self, request, context):
        """Stage 6: AI performance prediction through the unified plugin."""
        metrics = dict(request.metrics) if request.metrics else {}
        ai_result = self.stage6.ai.predict_performance(metrics)
        ai_result["timestamp"] = time.time()
        return pb.Stage6AIResponse(
            predicted_performance=float(ai_result.get("predicted_performance", 0.0)),
            status=str(ai_result.get("status") or "unknown"),
            recommendations=list(ai_result.get("recommendations") or []),
            ml_version=str(ai_result.get("ml_version") or ""),
        )

    def Stage6Forecast(self, request, context):
        """Stage 6: Load forecasting through the unified plugin."""
        horizon = int(request.forecast_horizon) if request.forecast_horizon else 30
        forecast = self.stage6.forecast.predict_load(horizon)
        predicted_cpu = float(forecast.get("predicted_cpu") or 0.5)
        predicted_loads = [round(predicted_cpu, 2) for _ in range(max(1, horizon))]
        return pb.Stage6ForecastResponse(
            predicted_loads=predicted_loads,
            status="success",
            forecast_timestamp=str(time.time()),
        )

    def Stage6AutoFix(self, request, context):
        """Stage 6: Automatic error fixing through the unified plugin."""
        error_data = {}
        if request.error_data:
            try:
                error_data = json.loads(request.error_data)
            except (ValueError, TypeError):
                error_data = {"raw": request.error_data}
        fix_result = self.stage6.auto_fix.detect_and_fix_errors(error_data)
        fix_result["timestamp"] = time.time()
        return pb.Stage6AutoFixResponse(
            status=str(fix_result.get("status") or "pending"),
            fixes_applied=list(fix_result.get("fixes_applied") or []),
            timestamp=str(fix_result.get("timestamp") or time.time()),
        )

    def Stage6SelfLearn(self, request, context):
        """Stage 6: Self-learning loop through the unified plugin."""
        results = []
        for example in request.results:
            metadata = dict(example.metadata) if example.metadata else {}
            results.append({
                "success": bool(metadata.get("success", True)),
                "performance": float(metadata.get("performance") or 0.5),
            })
        learned = self.stage6.self_learning.learn_from_results(results)
        stats = self.stage6.self_learning.get_learning_stats()
        adaptation = stats.get("adaptation_params") or {}
        stats_proto = pb.SelfLearningStats(
            is_trained=bool(stats.get("is_trained") or False),
            learning_rate=float(stats.get("learning_rate") or 0.0),
            min_confidence=float(stats.get("min_confidence") or 0.0),
            performance=str(adaptation.get("performance") or "unknown"),
            optimization_level=str(adaptation.get("optimization_level") or "unknown"),
        )
        return pb.Stage6SelfLearnResponse(
            success=bool(learned),
            timestamp=str(time.time()),
            stats=stats_proto,
        )

    def Stage6FullCycle(self, request, context):
        """Stage 6: Full unified cycle: AI -> Forecast -> AutoFix -> SelfLearning."""
        ai_response = self.Stage6AI(
            pb.Stage6AIRequest(metrics=dict(request.metrics) if request.metrics else {}), context)
        forecast_response = self.Stage6Forecast(
            pb.Stage6ForecastRequest(forecast_horizon=30), context)
        auto_fix_response = self.Stage6AutoFix(
            pb.Stage6AutoFixRequest(error_type="", error_data=""), context)
        self_learn_response = self.Stage6SelfLearn(
            pb.Stage6SelfLearnRequest(results=[]), context)
        return pb.Stage6FullCycleResponse(
            success=True,
            timestamp=str(time.time()),
            ai=ai_response,
            forecast=forecast_response,
            auto_fix=auto_fix_response,
            self_learning=self_learn_response,
        )

'''

content = content.rstrip('\r\n') + '\r\n' + methods_text.replace('\n', '\r\n')
with open(p, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print('OK')
