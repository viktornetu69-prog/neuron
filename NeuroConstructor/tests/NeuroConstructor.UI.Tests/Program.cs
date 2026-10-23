using System.Diagnostics;
using NeuroConstructor.UI.Services;

namespace NeuroConstructor.UI.Tests;

/// <summary>
/// Integration test for <see cref="NeuroGrpcClient"/> against the real Python core.
///
/// Starts `start_server.py` as a child process, waits for the gRPC endpoint to
/// accept connections and then exercises every RPC of the service.
/// </summary>
internal static class Program
{
    private const int Port = 50078;
    private const string Target = "localhost:50078";

    private static int _passed;
    private static int _failed;

    private static async Task<int> Main()
    {
        var repoRoot = FindRepoRoot();
        var coreDir = Path.Combine(repoRoot, "NeuroConstructor.Core");
        var workDir = Path.Combine(repoRoot, "tests", "_artifacts");
        Directory.CreateDirectory(workDir);

        var teacherPath = Path.Combine(workDir, "teacher_cpp.gguf");
        var sourceTeacher = Path.Combine(workDir, "teacher.gguf");
        if (!File.Exists(sourceTeacher))
        {
            Console.WriteLine("[FAIL] the synthetic teacher model is missing - run the Python test first");
            return 1;
        }
        File.Copy(sourceTeacher, teacherPath, overwrite: true);

        Console.WriteLine($"Starting Python core on port {Port}...");
        using var server = StartCore(coreDir, Port);

        try
        {
            if (!await WaitForServerAsync(Target, TimeSpan.FromSeconds(30)))
            {
                Console.WriteLine("[FAIL] the Python core did not start in time");
                return 1;
            }
            Console.WriteLine("[PASS] the Python core is listening\n");

            using var client = new NeuroGrpcClient(Target);

            Console.WriteLine("GetStatus");
            var status = await client.GetStatusAsync(new NeuroConstructor.StatusRequest());
            Check("status returns a response", status is not null);
            Check("no model loaded initially", status is not null && !status.ModelLoaded);

            Console.WriteLine("\nChat");
            var chat = await client.ChatAsync("Hello from C#");
            Check("chat echoes the message", chat.Message.Contains("Hello from C#"), chat.Message);
            Check("chat is not an error", !chat.IsError);

            Console.WriteLine("\nLoadTeacherModel");
            var load = await client.LoadTeacherModelAsync(
                new NeuroConstructor.TeacherModelRequest { ModelPath = teacherPath });
            Check("teacher load succeeds", load.Status == "success", load.ErrorMessage);
            Check("teacher quality score is set", load.QualityScore > 0f);

            Console.WriteLine("\nLoadTeacherModel with a missing file");
            var missing = await client.LoadTeacherModelAsync(
                new NeuroConstructor.TeacherModelRequest { ModelPath = Path.Combine(workDir, "nope.gguf") });
            Check("missing teacher reports an error", missing.Status == "error");

            Console.WriteLine("\nCreateStudentModel");
            var create = await client.CreateStudentModelAsync(
                new NeuroConstructor.CreateStudentRequest { TeacherModelPath = teacherPath });
            Check("student creation succeeds", create.Status == "success", create.ErrorMessage);
            Check("compression is reported", create.CompressionApplied);

            Console.WriteLine("\nConvertModel");
            var studentPath = Path.Combine(workDir, "student_cpp.gguf");
            var convert = await client.ConvertModelAsync(new NeuroConstructor.ConvertRequest
            {
                TeacherPath = teacherPath,
                StudentPath = studentPath
            });
            Check("conversion succeeds", convert.Status == "success", convert.ErrorMessage);
            Check("conversion reports a compression ratio", convert.CompressionRatio > 0f);
            Check("conversion reports a quality score", convert.QualityScore > 0f);

            Console.WriteLine("\nValidateModel");
            var validate = await client.ValidateModelAsync(new NeuroConstructor.ValidateRequest
            {
                TeacherModel = teacherPath,
                StudentModel = studentPath
            });
            Check("validation completes", string.IsNullOrEmpty(validate.ErrorMessage), validate.ErrorMessage);
            Check("validation reports a compatibility score", validate.CompatibilityScore > 0f);

            Console.WriteLine("\nGetStatus after loading");
            var status2 = await client.GetStatusAsync(new NeuroConstructor.StatusRequest());
            Check("model is reported as loaded", status2.ModelLoaded);
            Check("model path is reported", !string.IsNullOrEmpty(status2.ModelPath));
        }
        finally
        {
            if (!server.HasExited)
            {
                server.Kill(entireProcessTree: true);
            }
        }

        Console.WriteLine($"\n{_passed} passed, {_failed} failed");
        return _failed == 0 ? 0 : 1;
    }

    private static Process StartCore(string coreDir, int port)
    {
        var psi = new ProcessStartInfo("python", "start_server.py")
        {
            WorkingDirectory = coreDir,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        psi.Environment["NEURO_PORT"] = port.ToString();

        var process = Process.Start(psi)
            ?? throw new InvalidOperationException("Could not start the Python core");
        process.OutputDataReceived += (_, e) => { if (e.Data is not null) Console.WriteLine("[core] " + e.Data); };
        process.ErrorDataReceived += (_, e) => { if (e.Data is not null) Console.WriteLine("[core!] " + e.Data); };
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        return process;
    }

    private static async Task<bool> WaitForServerAsync(string target, TimeSpan timeout)
    {
        using var probe = new NeuroGrpcClient(target);
        var deadline = DateTime.UtcNow + timeout;
        while (DateTime.UtcNow < deadline)
        {
            try
            {
                await probe.GetStatusAsync(new NeuroConstructor.StatusRequest());
                return true;
            }
            catch
            {
                await Task.Delay(500);
            }
        }
        return false;
    }

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !Directory.Exists(Path.Combine(dir.FullName, "NeuroConstructor.Core")))
        {
            dir = dir.Parent;
        }
        return dir?.FullName ?? throw new InvalidOperationException("Repository root not found");
    }

    private static void Check(string name, bool condition, string detail = "")
    {
        if (condition)
        {
            _passed++;
            Console.WriteLine($"  [PASS] {name}");
        }
        else
        {
            _failed++;
            Console.WriteLine($"  [FAIL] {name} {detail}");
        }
    }
}
