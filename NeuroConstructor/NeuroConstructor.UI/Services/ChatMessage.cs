using System;

namespace NeuroConstructor.UI.Services
{
    /// <summary>
    /// Message model for chat history.
    /// </summary>
    public class ChatMessage
    {
        public string Sender { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public bool IsError { get; set; }
        public string? ErrorDetail { get; set; }
        public string TextColor => IsError ? "#ff5f57" : "#4ec9b0";
    }
}
