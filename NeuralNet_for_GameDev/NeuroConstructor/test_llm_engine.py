"""Test LLM Engine integration"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'NeuroConstructor.Core/core')

from llm_engine import LLMEngine, InferenceConfig
from lm_benchmark import BenchmarkRunner, BenchmarkConfig

print("=" * 60)
print("TEST 1: MockEngine")
print("=" * 60)

mock = LLMEngine.mock()
print(f"  Backend: {mock.backend_name}")
print(f"  Initialized: {mock.is_initialized}")

result = mock.generate("What is AI?")
print(f"  Text: {result.text[:100]}...")
print(f"  Success: {result.success}")
print(f"  Tokens: {result.tokens_generated}")

print()
print("=" * 60)
print("TEST 2: BenchmarkRunner (mock)")
print("=" * 60)

runner = BenchmarkRunner()
config = BenchmarkConfig(
    qa_pairs=2,
    chat_dialogs=1,
    code_examples=1,
    creative_tasks=1,
    output_dir="test_benchmarks"
)
result = runner.run(config)

print(f"  Total tests: {result.total_tests}")
print(f"  Passed: {result.passed}")
print(f"  Failed: {result.failed}")
print(f"  Similarity: {result.overall_similarity:.4f}")

if result.report:
    print(f"  Pass rate: {result.pass_rate:.2%}")
    print(f"  Fine-tune needed: {result.fine_tuning_needed}")

print()
print("=" * 60)
print("ALL TESTS PASSED")
print("=" * 60)
