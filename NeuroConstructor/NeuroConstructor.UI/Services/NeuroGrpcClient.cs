using System;
using System.Net.Http;
using System.Threading.Tasks;
using Grpc.Net.Client;

namespace NeuroConstructor.UI.Services
{
    /// <summary>
    /// gRPC client for communicating with the NeuroConstructor Python backend.
    /// Connects to localhost:50051.
    /// </summary>
    public class NeuroGrpcClient : IDisposable
    {
        private readonly GrpcChannel? _channel;
        private NeuroConstructor.NeuroService.NeuroServiceClient? _neuroServiceClient;
        private NeuroConstructor.DatasetService.DatasetServiceClient? _datasetServiceClient;
        private bool _disposed;

        public NeuroGrpcClient(string target = "http://localhost:50051")
        {
            // GrpcChannel requires an explicit scheme; a bare "host:port" would be
            // parsed as the scheme "host".
            if (!target.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                !target.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                target = "http://" + target;
            }

            _channel = GrpcChannel.ForAddress(target, new GrpcChannelOptions
            {
                HttpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) },
                MaxReceiveMessageSize = 100 * 1024 * 1024 // 100 MB
            });
            _neuroServiceClient = new NeuroConstructor.NeuroService.NeuroServiceClient(_channel);
            _datasetServiceClient = new NeuroConstructor.DatasetService.DatasetServiceClient(_channel);
        }

        public bool IsConnected => _neuroServiceClient != null && _datasetServiceClient != null;

        public async Task<NeuroConstructor.Template> GetTemplateAsync(
            NeuroConstructor.GetTemplateRequest request,
            CancellationToken ct = default)
        {
            if (_datasetServiceClient == null)
                throw new InvalidOperationException("Client not initialized. Check server connection.");
            return await _datasetServiceClient.GetTemplateAsync(request, cancellationToken: ct);
        }

        public async Task<NeuroConstructor.CreateDatasetResponse> CreateDatasetAsync(
            NeuroConstructor.CreateDatasetRequest request,
            CancellationToken ct = default)
        {
            if (_datasetServiceClient == null)
                throw new InvalidOperationException("Client not initialized. Check server connection.");
            return await _datasetServiceClient.CreateDatasetAsync(request, cancellationToken: ct);
        }

        public async Task<NeuroConstructor.Example> AddExampleAsync(
            NeuroConstructor.AddExampleRequest request,
            CancellationToken ct = default)
        {
            if (_datasetServiceClient == null)
                throw new InvalidOperationException("Client not initialized. Check server connection.");
            return await _datasetServiceClient.AddExampleAsync(request, cancellationToken: ct);
        }

        public async Task<NeuroConstructor.ListExamplesResponse> ListExamplesAsync(
            NeuroConstructor.ListExamplesRequest request,
            CancellationToken ct = default)
        {
            if (_datasetServiceClient == null)
                throw new InvalidOperationException("Client not initialized. Check server connection.");
            return await _datasetServiceClient.ListExamplesAsync(request, cancellationToken: ct);
        }

        public async Task<NeuroConstructor.ChatResponse> ChatAsync(
            string message,
            NeuroConstructor.Message[]? history = null,
            CancellationToken ct = default)
        {
            if (_neuroServiceClient == null)
                throw new InvalidOperationException("Client not initialized. Check server connection.");

            var request = new NeuroConstructor.ChatRequest
            {
                Message = message,
                History = { history ?? Array.Empty<NeuroConstructor.Message>() }
            };

            return await _neuroServiceClient.ChatAsync(request, cancellationToken: ct);
        }

        public async Task<NeuroConstructor.StatusResponse> GetStatusAsync(
            NeuroConstructor.StatusRequest request,
            CancellationToken ct = default)
        {
            if (_neuroServiceClient == null)
                throw new InvalidOperationException("Client not initialized. Check server connection.");

            return await _neuroServiceClient.GetStatusAsync(request, cancellationToken: ct);
        }

        public async Task<NeuroConstructor.TeacherModelResponse> LoadTeacherModelAsync(
            NeuroConstructor.TeacherModelRequest request,
            CancellationToken ct = default)
        {
            if (_neuroServiceClient == null)
                throw new InvalidOperationException("Client not initialized. Check server connection.");

            return await _neuroServiceClient.LoadTeacherModelAsync(request, cancellationToken: ct);
        }

        public async Task<NeuroConstructor.CreateStudentResponse> CreateStudentModelAsync(
            NeuroConstructor.CreateStudentRequest request,
            CancellationToken ct = default)
        {
            if (_neuroServiceClient == null)
                throw new InvalidOperationException("Client not initialized. Check server connection.");

            return await _neuroServiceClient.CreateStudentModelAsync(request, cancellationToken: ct);
        }

        public async Task<NeuroConstructor.ConvertResponse> ConvertModelAsync(
            NeuroConstructor.ConvertRequest request,
            CancellationToken ct = default)
        {
            if (_neuroServiceClient == null)
                throw new InvalidOperationException("Client not initialized. Check server connection.");

            return await _neuroServiceClient.ConvertModelAsync(request, cancellationToken: ct);
        }

        public async Task<NeuroConstructor.ValidateResponse> ValidateModelAsync(
            NeuroConstructor.ValidateRequest request,
            CancellationToken ct = default)
        {
            if (_neuroServiceClient == null)
                throw new InvalidOperationException("Client not initialized. Check server connection.");

            return await _neuroServiceClient.ValidateModelAsync(request, cancellationToken: ct);
        }

        public async Task<NeuroConstructor.ExportDatasetResponse> ExportDatasetAsync(
            NeuroConstructor.ExportDatasetRequest request,
            CancellationToken ct = default)
        {
            if (_datasetServiceClient == null)
                throw new InvalidOperationException("Client not initialized. Check server connection.");
            return await _datasetServiceClient.ExportDatasetAsync(request, cancellationToken: ct);
        }

        public async Task<NeuroConstructor.ListTemplatesResponse> ListTemplatesAsync(
            NeuroConstructor.ListTemplatesRequest request,
            CancellationToken ct = default)
        {
            if (_datasetServiceClient == null)
                throw new InvalidOperationException("Client not initialized. Check server connection.");
            return await _datasetServiceClient.ListTemplatesAsync(request, cancellationToken: ct);
        }

        public async Task<NeuroConstructor.ValidateDatasetResponse> ValidateDatasetAsync(
            NeuroConstructor.ValidateDatasetRequest request,
            CancellationToken ct = default)
        {
            if (_datasetServiceClient == null)
                throw new InvalidOperationException("Client not initialized. Check server connection.");
            return await _datasetServiceClient.ValidateDatasetAsync(request, cancellationToken: ct);
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            _channel?.Dispose();
        }
    }
}
