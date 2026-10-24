from core.model_inference import ModelInference, PredictionResult

print("Import OK")

# Test with student model info
inf = ModelInference()
r = inf.predict(
    model_info={"weights": {"cpu_usage": 0.4, "memory_usage": 0.3, "execution_time": 0.2, "load": 0.1}},
    scenario="performance",
    features={"cpu_usage": 0.2, "memory_usage": 0.3}
)
print("With model_info:", r)

# Test without model info - performance scenario
r2 = inf.predict(
    model_info=None,
    scenario="performance",
    features={"cpu_usage": 0.7, "memory_usage": 0.5}
)
print("No model_info (performance):", r2)

# Test load scenario without model
r3 = inf.predict(
    model_info=None,
    scenario="load",
    features={"load": 0.8}
)
print("No model_info (load):", r3)

# Test resource scenario without model
r4 = inf.predict(
    model_info=None,
    scenario="resource",
    features={"cpu_usage": 0.9, "memory_usage": 0.8}
)
print("No model_info (resource):", r4)

# Verify dataclass fields
print("prediction type:", type(r.prediction))
print("confidence type:", type(r.confidence))
print("confidence value:", r.confidence)