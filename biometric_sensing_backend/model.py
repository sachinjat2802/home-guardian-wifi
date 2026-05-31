import torch
import torch.nn as nn
import torch.nn.functional as F

class GaitCNNModel(nn.Module):
    """
    Highly optimized, lightweight 1D-CNN + Bidirectional LSTM network
    tailored for sub-millisecond physical biometric identification on edge CPUs.
    
    Input shape: (batch_size, channels, sequence_length)
    - channels = 126 (63 CFO phase-canceled subcarriers, real and imaginary channels)
    - sequence_length = 600 (representing a 60-second window sampled at 10Hz)
    """
    def __init__(self, in_channels: int = 126, num_classes: int = 5, d_model: int = 16):
        super().__init__()
        
        # 1. 1D temporal CNN Layer block to extract localized micro-Doppler patterns
        self.conv1 = nn.Conv1d(
            in_channels=in_channels,
            out_channels=d_model,
            kernel_size=5,
            stride=1,
            padding=2,
            bias=False
        )
        self.bn1 = nn.BatchNorm1d(d_model)
        self.pool1 = nn.MaxPool1d(kernel_size=2)  # Downsamples sequence_length to 300
        
        self.conv2 = nn.Conv1d(
            in_channels=d_model,
            out_channels=d_model * 2,
            kernel_size=5,
            stride=1,
            padding=2,
            bias=False
        )
        self.bn2 = nn.BatchNorm1d(d_model * 2)
        self.pool2 = nn.MaxPool1d(kernel_size=2)  # Downsamples sequence_length to 150
        
        # 2. Bidirectional LSTM block to model long-term temporal gait cadences
        self.lstm = nn.LSTM(
            input_size=d_model * 2,
            hidden_size=d_model * 2,
            num_layers=1,
            batch_first=True,
            bidirectional=True
        )
        
        # 3. Dense Fully Connected Classification Head
        # Bidirectional LSTM output size = hidden_size * 2 (d_model * 4)
        lstm_output_dim = d_model * 4
        
        self.fc_head = nn.Sequential(
            nn.Linear(lstm_output_dim, d_model * 2),
            nn.LayerNorm(d_model * 2),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.1),
            nn.Linear(d_model * 2, num_classes)
        )
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward propagation pass.
        Expects tensor of shape: (B, C, T) where C=126 and T=600
        """
        # --- CNN Temporal Feature Extraction ---
        x = self.conv1(x)
        x = self.bn1(x)
        x = F.relu(x, inplace=True)
        x = self.pool1(x)
        
        x = self.conv2(x)
        x = self.bn2(x)
        x = F.relu(x, inplace=True)
        x = self.pool2(x)
        
        # --- Reshape for Recurrent Block ---
        # Conv1D outputs (B, channels, length). We transpose to (B, length, channels) for LSTM
        x = x.transpose(1, 2)
        
        # --- LSTM Sequence Sequence Modeling ---
        # lstm_out shape: (B, T_seq, hidden_size * 2)
        lstm_out, _ = self.lstm(x)
        
        # Pull global sequence context (temporal pooling using the last hidden output)
        gait_features = lstm_out[:, -1, :]
        
        # --- Dense Classification ---
        logits = self.fc_head(gait_features)
        
        # Apply Softmax to predict normalized classification probabilities (confidence scores)
        confidence_probs = F.softmax(logits, dim=-1)
        return confidence_probs

# edge compilation assistant
def optimize_model_for_cpu(model: nn.Module) -> nn.Module:
    """
    Applies static execution graph optimization for peak performance on host CPUs.
    """
    model.eval()
    try:
        # Trace model to compile optimized JIT bytecode
        mock_input = torch.randn(1, 126, 600)
        traced_model = torch.jit.trace(model, mock_input)
        return traced_model
    except Exception as e:
        print(f"⚠️ Trace-optimization bypassed: {e}")
        return model
