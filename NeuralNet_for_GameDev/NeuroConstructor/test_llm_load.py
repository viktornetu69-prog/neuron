"""Test LLM Engine CPU vs GPU"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'NeuroConstructor.Core/core')

from llm_engine import LlamaCppEngine, LlamaCppEngine as Llama
import os

path = 'NeuroConstructor.Core/models/teacher/Qwen3-4B-Thinking-2507-Q4_K_M.gguf'
print(f"Model: {path}")
print(f"Size: {os.path.getsize(path)/1024**3:.2f}GB")

# Test 1: GPU (n_gpu_layers=-1)
print("\n=== TEST 1: GPU (n_gpu_layers=-1) ===")
try:
    engine_gpu = LlamaCppEngine(
        model_path=path,
        n_gpu_layers=-1,
        n_threads=8
    )
    print(f"GPU: Success! model={engine_gpu.model is not None}, initialized={engine_gpu._initialized}")
except Exception as e:
    print(f"GPU: Failed - {e}")

# Test 2: CPU (n_gpu_layers=0)
print("\n=== TEST 2: CPU (n_gpu_layers=0) ===")
try:
    engine_cpu = LlamaCppEngine(
        model_path=path,
        n_gpu_layers=0,
        n_threads=4
    )
    print(f"CPU: Success! model={engine_cpu.model is not None}, initialized={engine_cpu._initialized}")
except Exception as e:
    print(f"CPU: Failed - {e}")

print("\nDone!")
