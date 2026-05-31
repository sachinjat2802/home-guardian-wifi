import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, Any, Tuple

class DepthwiseSeparableConv1d(nn.Module):
    """
    Highly efficient Conv1d block minimizing parameter count for CPU and edge nodes.
    Separates spatial/channel filtering (Depthwise) and combination (Pointwise).
    """
    def __init__(self, in_channels: int, out_channels: int, kernel_size: int, stride: int = 1, padding: int = 0):
        super().__init__()
        self.depthwise = nn.Conv1d(
            in_channels, in_channels, kernel_size=kernel_size, 
            stride=stride, padding=padding, groups=in_channels, bias=False
        )
        self.pointwise = nn.Conv1d(in_channels, out_channels, kernel_size=1, bias=False)
        self.bn = nn.BatchNorm1d(out_channels)
        self.act = nn.ReLU(inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.depthwise(x)
        x = self.pointwise(x)
        x = self.bn(x)
        return self.act(x)

class GaitRecognitionNet(nn.Module):
    """
    Lightweight, High-Performance 1D-CNN + Bidirectional GRU Neural Network 
    designed specifically for passive WiFi Gait Recognition.
    
    Input shape:  (batch_size, channels, sequence_length)
                  - channels: Number of subcarriers/doppler features (e.g., 64)
                  - sequence_length: 60-second window at 10Hz = 600 steps
    Output shape: (batch_size, num_classes) - Class logits for confidence scoring.
    """
    def __init__(self, num_classes: int = 5, in_channels: int = 64, hidden_size: int = 64, num_gru_layers: int = 2):
        super().__init__()
        self.num_classes = num_classes
        self.hidden_size = hidden_size
        
        # 1. Convolutional Feature Extractor (Temporal convolutions on Doppler frequency bins)
        self.conv1 = DepthwiseSeparableConv1d(in_channels, 64, kernel_size=7, stride=2, padding=3)  # L -> L/2
        self.conv2 = DepthwiseSeparableConv1d(64, 128, kernel_size=5, stride=2, padding=2)          # L/2 -> L/4
        self.conv3 = DepthwiseSeparableConv1d(128, 128, kernel_size=3, stride=1, padding=1)         # L/4 -> L/4
        
        self.pool = nn.MaxPool1d(kernel_size=2, stride=2)  # L/4 -> L/8
        self.dropout_conv = nn.Dropout1d(p=0.2)

        # 2. Recurrent Sequence Encoder (Captures temporal cadence and step cycles)
        # Sequence input shape to GRU must be (sequence_length, batch_size, input_size) or
        # (batch_size, sequence_length, input_size) if batch_first=True
        self.gru = nn.GRU(
            input_size=128,
            hidden_size=hidden_size,
            num_layers=num_gru_layers,
            batch_first=True,
            bidirectional=True,
            dropout=0.3 if num_gru_layers > 1 else 0.0
        )

        # 3. Dense Classifier Head
        # Bidirectional GRU outputs hidden_size * 2 features
        gru_output_dim = hidden_size * 2
        
        self.classifier = nn.Sequential(
            nn.Linear(gru_output_dim * 2, 64),  # Multiplying by 2 because we use Mean + Max pooling
            nn.LayerNorm(64),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.4),
            nn.Linear(64, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Check input size: [Batch, Channels, SeqLen]
        batch_size, channels, seq_len = x.shape
        
        # 1. Apply Convolutional Pipeline
        x = self.conv1(x)
        x = self.conv2(x)
        x = self.conv3(x)
        x = self.pool(x)
        x = self.dropout_conv(x)
        
        # 2. Prepare for Recurrent Layer
        # Current shape: [Batch, Features(128), SeqLen_reduced]
        # GRU expects: [Batch, SeqLen_reduced, Features(128)]
        x = x.transpose(1, 2)
        
        # Pass through Bidirectional GRU
        # gru_out shape: [Batch, SeqLen_reduced, HiddenSize * 2]
        gru_out, _ = self.gru(x)
        
        # 3. Global Temporal Pooling (Combines average and peak temporal patterns)
        # pooling across time dimension (dimension 1)
        mean_pool = torch.mean(gru_out, dim=1)
        max_pool, _ = torch.max(gru_out, dim=1)
        
        # Concatenate poolings for richer representation: [Batch, HiddenSize * 4]
        pooled = torch.cat([mean_pool, max_pool], dim=1)
        
        # 4. Dense Classifier Output
        logits = self.classifier(pooled)
        return logits

    def get_probabilities(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Runs model inference and outputs the softmax probabilities and predicted classes.
        """
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            probs = F.softmax(logits, dim=-1)
            confidence, predicted_class = torch.max(probs, dim=-1)
        return probs, confidence, predicted_class


def optimize_for_edge(model: nn.Module) -> nn.Module:
    """
    Applies Dynamic INT8 Quantization to the model for massive speedups on CPU.
    Reduces memory footprint by ~75% and improves latency by 2x-4x.
    """
    import logging
    logger = logging.getLogger("GaitRecognitionNet")
    logger.info("Applying dynamic 8-bit integer quantization to recurrent and linear weights...")
    quantized_model = torch.quantization.quantize_dynamic(
        model, 
        {nn.Linear, nn.GRU}, 
        dtype=torch.qint8
    )
    return quantized_model

# ==============================================================================
# Dry-run execution test
# ==============================================================================
if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    log = logging.getLogger("ModelTest")
    
    # 1. Instantiate Model
    model = GaitRecognitionNet(num_classes=5, in_channels=64)
    log.info(f"Model parameters: {sum(p.numel() for p in model.parameters() if p.requires_grad):,}")
    
    # 2. Simulate 60 seconds of subcarrier Doppler Spectrograms
    # 10Hz sampling rate -> 600 time steps
    batch_size = 4
    channels = 64
    sequence_length = 600
    mock_input = torch.randn(batch_size, channels, sequence_length)
    
    # 3. Test forward pass
    logits = model(mock_input)
    log.info(f"Input Shape: {mock_input.shape}")
    log.info(f"Output Logits Shape: {logits.shape}")
    
    # 4. Test probability conversion
    probs, confs, preds = model.get_probabilities(mock_input)
    log.info(f"Output Predicted Classes: {preds}")
    log.info(f"Confidence Scores: {confs}")
    
    # 5. Dynamic edge quantization demo
    quantized = optimize_for_edge(model)
    log.info("Edge Optimization Successful.")
