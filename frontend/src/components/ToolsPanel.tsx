import { useAppState } from '../store/appState';

export const ToolsPanel = () => {
  // Phase 1: Use global app state - tool outputs persist across tab switches
  const { toolOutputs } = useAppState();

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-800">Tool Outputs</h2>
        <p className="text-sm text-gray-500 mt-1">
          View results from file operations and searches
        </p>
      </div>

      {/* Outputs */}
      <div className="flex-1 overflow-y-auto p-4">
        {toolOutputs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">🔧</div>
              <div className="text-xl font-semibold">No tool outputs yet</div>
              <div className="text-sm mt-2">
                Tool operations will appear here
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[...toolOutputs].reverse().map((output) => (
              <div
                key={output.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                      {output.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {output.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-3 mt-2">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(output.data, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

