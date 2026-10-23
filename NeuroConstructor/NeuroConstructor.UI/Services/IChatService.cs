using System;
using System.Collections.ObjectModel;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Grpc.Net.Client;

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
    }
}
