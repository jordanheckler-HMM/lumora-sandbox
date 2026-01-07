import { useEffect, useState } from 'react';
import { useAppState } from '../store/appState';
import { fetchModels } from '../api';
import type { Model } from '../api';

const tabs = [
  { id: 'chat' as const, label: 'Chat', icon: '💬' },
  { id: 'code' as const, label: 'Code', icon: '⌨️' },
  { id: 'documents' as const, label: 'Documents', icon: '📝' },
  { id: 'sheets' as const, label: 'Sheets', icon: '📊' },
  { id: 'tools' as const, label: 'Tools', icon: '🔧' },
  { id: 'workspace' as const, label: 'Workspace', icon: '📁' },
];

export const Sidebar = () => {
  // Phase 1: Use global app state
  const { selectedModel, setSelectedModel, activeTab, setActiveTab } = useAppState();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const modelsList = await fetchModels();
      setModels(modelsList);
      if (modelsList.length > 0 && !selectedModel) {
        setSelectedModel(modelsList[0].name);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load models');
      console.error('Error loading models:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full border-r border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          LUMORA
        </h1>
        <p className="text-xs text-gray-400 mt-1">AI OS Sandbox</p>
      </div>

      {/* Model Selector */}
      <div className="p-4 border-b border-gray-800">
        <label className="block text-xs font-semibold text-gray-400 mb-2">
          MODEL
        </label>
        {loading ? (
          <div className="text-sm text-gray-500">Loading models...</div>
        ) : error ? (
          <div className="text-sm text-red-400">
            <div className="mb-2">{error}</div>
            <button
              onClick={loadModels}
              className="text-xs bg-red-900 hover:bg-red-800 px-2 py-1 rounded"
            >
              Retry
            </button>
          </div>
        ) : (
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex-1 p-2">
        <div className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
        <div>Local AI • Ollama</div>
        <div className="mt-1">
          {models.length} model{models.length !== 1 ? 's' : ''} available
        </div>
      </div>
    </div>
  );
};

