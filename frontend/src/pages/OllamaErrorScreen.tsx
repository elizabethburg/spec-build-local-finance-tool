export default function OllamaErrorScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">Ollama isn't running</h1>
        <p className="text-gray-600">
          This app uses a local AI model to process your financial data.
          Start Ollama and relaunch the app to continue.
        </p>
        <p className="text-sm text-gray-400">
          Download Ollama at <span className="font-mono">ollama.com</span>
        </p>
      </div>
    </div>
  )
}
