"""
Distillation Trainer — fine-tuning Student на Teacher output.

Pipeline:
1. Создать fine-tuning датасет (Teacher output = target)
2. Distillation loss: KL-divergence between logits
3. Fine-tune Student на (input, Teacher_output)
4. Повторять цикл, пока similarity < threshold
"""

import json
import os
from typing import Dict, List, Optional, Any, Tuple, Callable
from datetime import datetime
from dataclasses import dataclass, field

# Optional dependencies
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import Dataset, DataLoader
    TORCH_AVAILABLE = True
except ImportError:
    torch = None
    nn = None
    optim = None
    TORCH_AVAILABLE = False


@dataclass
class DistillationConfig:
    """Configuration for distillation training."""
    learning_rate: float = 1e-4
    epochs: int = 10
    batch_size: int = 8
    temperature: float = 4.0  # for soft target distillation
    alpha: float = 0.7  # weight for KL divergence loss
    beta: float = 0.3  # weight for hard target loss
    kl_weight: float = 1.0
    scheduler: str = "cosine"
    weight_decay: float = 0.01
    early_stopping_patience: int = 3
    output_dir: str = "distillation_outputs"
    save_interval: int = 1
    threshold: float = 0.85


@dataclass
class TrainingMetrics:
    """Metrics tracked during training."""
    epoch: int = 0
    loss: float = 0.0
    kl_loss: float = 0.0
    hard_loss: float = 0.0
    similarity: float = 0.0
    lr: float = 0.0
    metrics: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "epoch": self.epoch,
            "loss": round(self.loss, 4),
            "kl_loss": round(self.kl_loss, 4),
            "hard_loss": round(self.hard_loss, 4),
            "similarity": round(self.similarity, 4),
            "lr": round(self.lr, 6),
            "details": self.metrics,
        }


class DistillationDataset(Dataset):
    """Dataset for distillation training."""

    def __init__(self, data: List[Dict[str, str]]):
        self.data = data

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        item = self.data[idx]
        return {
            "question": item.get("question", item.get("prompt", "")),
            "teacher_answer": item.get("teacher_answer", item.get("expected", "")),
            "student_answer": item.get("student_answer", item.get("actual", "")),
        }


class DistillationTrainer:
    """
    Fine-tune Student model using Teacher outputs as soft/hard targets.

    Loss = alpha * KL divergence(student_logits || teacher_logits)
         + beta * CrossEntropy(student_outputs, teacher_hard_labels)
    """

    def __init__(self, config: Optional[DistillationConfig] = None):
        self.config = config or DistillationConfig()
        self.training_history: List[TrainingMetrics] = []
        self.best_similarity = 0.0
        self.best_model_state = None

    def prepare_training_data(
        self,
        test_results: List[Dict],
    ) -> List[Dict]:
        """
        Prepare training data from benchmark results.
        Keep tests where student performed poorly (similarity < threshold).
        """
        threshold = self.config.threshold
        training_data = []

        for result in test_results:
            if result.get("overall_score", 1.0) < threshold:
                # Student needs improvement on this test
                training_data.append({
                    "question": result.get("question", ""),
                    "teacher_answer": result.get("teacher_answer", ""),
                    "student_answer": result.get("student_answer", ""),
                    "current_similarity": result.get("overall_score", 0.0),
                })

        return training_data

    def train_step(
        self,
        model: Any,
        optimizer: Any,
        scheduler: Any,
        train_data: List[Dict],
        teacher_fn: Callable,
        student_fn: Callable,
        comparator: Any,
        epoch: int,
    ) -> TrainingMetrics:
        """
        Perform one epoch of training.

        Args:
            model: PyTorch model to fine-tune
            optimizer: Optimizer
            scheduler: Learning rate scheduler
            train_data: Training examples
            teacher_fn: Returns teacher logits/answers
            student_fn: Returns student logits/answers
            comparator: AnswerComparator instance
            epoch: Current epoch number
        """
        if not TORCH_AVAILABLE:
            raise ImportError("torch is required for distillation training")

        total_loss = 0.0
        total_kl = 0.0
        total_hard = 0.0
        total_sim = 0.0
        n_samples = 0

        model.train()

        # Create DataLoader
        dataset = DistillationDataset(train_data)
        dataloader = DataLoader(dataset, batch_size=self.config.batch_size, shuffle=True)

        for batch in dataloader:
            optimizer.zero_grad()

            # Forward pass
            losses = []
            kls = []
            hard_losses = []
            sims = []

            for item in batch:
                question = item["question"]
                teacher_answer = item["teacher_answer"]
                student_answer = item["student_answer"]

                # Teacher logits (fixed, no grad)
                with torch.no_grad():
                    teacher_logits = self._get_logits(teacher_fn(question), teacher_answer)

                # Student logits
                student_logits = self._get_logits(student_fn(question), student_answer)

                # KL divergence loss (soft targets)
                kl_loss = self._kl_divergence(student_logits, teacher_logits, self.config.temperature)
                kls.append(kl_loss)

                # Hard target loss (cross-entropy)
                hard_loss = self._cross_entropy(student_logits, teacher_logits)
                hard_losses.append(hard_loss)

                losses.append(self.config.alpha * kl_loss + self.config.beta * hard_loss)

                # Compare current performance
                sim = self._compute_similarity(student_answer, teacher_answer, comparator)
                sims.append(sim)

            # Mean loss over batch
            batch_loss = torch.mean(torch.stack(losses))
            batch_kl = torch.mean(torch.stack(kls))
            batch_hard = torch.mean(torch.stack(hard_losses))
            batch_sim = torch.mean(torch.stack(sims))

            # Backward pass
            batch_loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            if scheduler:
                scheduler.step()

            total_loss += batch_loss.item()
            total_kl += batch_kl.item()
            total_hard += batch_hard.item()
            total_sim += batch_sim.item()
            n_samples += 1

        # Average metrics
        metrics = TrainingMetrics(
            epoch=epoch + 1,
            loss=total_loss / max(n_samples, 1),
            kl_loss=total_kl / max(n_samples, 1),
            hard_loss=total_hard / max(n_samples, 1),
            similarity=total_sim / max(n_samples, 1),
            lr=scheduler.get_last_lr()[0] if scheduler else self.config.learning_rate,
        )

        self.training_history.append(metrics)

        # Track best model
        if metrics.similarity > self.best_similarity:
            self.best_similarity = metrics.similarity
            if model:
                self.best_model_state = {k: v.clone() for k, v in model.state_dict().items()}

        return metrics

    def train_loop(
        self,
        model: Any,
        train_data: List[Dict],
        teacher_fn: Callable,
        student_fn: Callable,
        comparator: Any,
        validation_data: Optional[List[Dict]] = None,
    ) -> List[TrainingMetrics]:
        """
        Full training loop with early stopping.
        """
        if not TORCH_AVAILABLE:
            raise ImportError("torch is required for distillation training")

        # Setup
        optimizer = optim.AdamW(model.parameters(), lr=self.config.learning_rate, weight_decay=self.config.weight_decay)
        scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=self.config.epochs)

        patience_counter = 0
        best_loss = float('inf')

        for epoch in range(self.config.epochs):
            # Train one epoch
            metrics = self.train_step(
                model, optimizer, scheduler,
                train_data, teacher_fn, student_fn, comparator, epoch
            )

            # Validation
            if validation_data:
                val_metrics = self.evaluate(model, validation_data, teacher_fn, student_fn, comparator)
                metrics.metrics["val_similarity"] = val_metrics.similarity

            # Early stopping based on loss
            if metrics.loss < best_loss:
                best_loss = metrics.loss
                patience_counter = 0
            else:
                patience_counter += 1

            if patience_counter >= self.config.early_stopping_patience:
                print(f"Early stopping at epoch {epoch + 1}")
                break

            # Save checkpoint
            if self.config.save_interval > 0 and (epoch + 1) % self.config.save_interval == 0:
                self._save_checkpoint(model, epoch + 1, metrics)

        # Restore best model
        if self.best_model_state:
            model.load_state_dict(self.best_model_state)

        return self.training_history

    def evaluate(
        self,
        model: Any,
        eval_data: List[Dict],
        teacher_fn: Callable,
        student_fn: Callable,
        comparator: Any,
    ) -> TrainingMetrics:
        """Evaluate current model performance."""
        total_sim = 0.0
        n = 0

        model.eval()
        with torch.no_grad():
            for item in eval_data:
                student_answer = student_fn(item["question"])
                sim = self._compute_similarity(student_answer, item["teacher_answer"], comparator)
                total_sim += sim
                n += 1

        return TrainingMetrics(
            epoch=0,
            similarity=total_sim / max(n, 1),
        )

    def save_checkpoint(self, model: Any, epoch: int, metrics: TrainingMetrics) -> str:
        """Save model checkpoint."""
        os.makedirs(self.config.output_dir, exist_ok=True)
        checkpoint_path = os.path.join(
            self.config.output_dir,
            f"checkpoint_epoch_{epoch}.pth"
        )

        checkpoint = {
            "epoch": epoch,
            "model_state_dict": model.state_dict() if model else None,
            "metrics": metrics.to_dict(),
            "timestamp": datetime.now().isoformat(),
        }

        torch.save(checkpoint, checkpoint_path)
        return checkpoint_path

    def load_checkpoint(self, path: str) -> Dict:
        """Load model checkpoint."""
        return torch.load(path, map_location="cpu", weights_only=True)

    def save_training_history(self, output_path: str) -> str:
        """Save training history to JSON."""
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        history = [m.to_dict() for m in self.training_history]
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump({
                "history": history,
                "best_similarity": self.best_similarity,
                "config": {
                    "learning_rate": self.config.learning_rate,
                    "epochs": self.config.epochs,
                    "batch_size": self.config.batch_size,
                    "temperature": self.config.temperature,
                    "alpha": self.config.alpha,
                    "beta": self.config.beta,
                },
                "timestamp": datetime.now().isoformat(),
            }, f, indent=2, ensure_ascii=False)
        return output_path

    # ─── Private helper methods ────────────────────────────────────────

    def _get_logits(self, fn: Callable, *args) -> Any:
        """Mock logits extraction — in production, return actual model logits."""
        # Placeholder: return random tensor for now
        # Real implementation would extract logits from model forward pass
        if TORCH_AVAILABLE:
            return torch.randn(10)  # 10 classes placeholder
        return None

    def _kl_divergence(self, student_logits: Any, teacher_logits: Any, temperature: float = 4.0) -> Any:
        """KL divergence between student and teacher (with temperature scaling)."""
        if not TORCH_AVAILABLE:
            return 0.0

        student_log_probs = torch.nn.functional.log_softmax(student_logits / temperature, dim=-1)
        teacher_probs = torch.nn.functional.softmax(teacher_logits / temperature, dim=-1)
        kl = torch.nn.functional.kl_div(student_log_probs, teacher_probs, reduction='batchmean') * (temperature ** 2)
        return kl

    def _cross_entropy(self, student_logits: Any, teacher_targets: Any) -> Any:
        """Cross-entropy loss against teacher hard targets."""
        if not TORCH_AVAILABLE:
            return 0.0

        return torch.nn.functional.cross_entropy(student_logits, teacher_targets.argmax(dim=-1))

    def _compute_similarity(self, student_answer: str, teacher_answer: str, comparator: Any) -> float:
        """Compute similarity between student and teacher answers."""
        if comparator:
            result = comparator.compare(
                test_id="eval",
                question="",
                teacher_answer=teacher_answer,
                student_answer=student_answer,
            )
            return result.overall_score
        return 0.0

    def _save_checkpoint(self, model: Any, epoch: int, metrics: TrainingMetrics):
        """Save training checkpoint."""
        self.save_checkpoint(model, epoch, metrics)
