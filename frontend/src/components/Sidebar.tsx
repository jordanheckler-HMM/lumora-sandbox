import { useCallback, useEffect, useState } from 'react';
import { useAppState } from '../store/appState';
import { fetchModels, fetchSystemHealth } from '../api';
import type { Model, SystemHealth } from '../api';
import { isTauri } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';
import toast from 'react-hot-toast';

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
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [installingUpdate, setInstallingUpdate] = useState(false);

  const loadModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const modelsList = await fetchModels();
      setModels(modelsList);
      if (modelsList.length > 0 && !selectedModel) {
        setSelectedModel(modelsList[0].name);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load models';
      setError(message);
      console.error('Error loading models:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedModel, setSelectedModel]);

  const loadSystemHealth = useCallback(async () => {
    try {
      setHealthLoading(true);
      setHealthError(null);
      const healthData = await fetchSystemHealth();
      setHealth(healthData);
    } catch (healthCheckError: unknown) {
      const message = healthCheckError instanceof Error ? healthCheckError.message : 'Health check failed';
      setHealth(null);
      setHealthError(message);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    loadSystemHealth();

    const intervalId = window.setInterval(() => {
      loadSystemHealth();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadSystemHealth]);

  useEffect(() => {
    let cancelled = false;

    const checkForUpdates = async () => {
      if (!isTauri()) {
        return;
      }

      try {
        const update = await check();
        if (!cancelled) {
          setAvailableUpdate(update);
        } else if (update) {
          await update.close();
        }
      } catch (updateError) {
        // Keep this silent in UI; logs are enough for troubleshooting.
        console.error('Failed to check for updates:', updateError);
      }
    };

    checkForUpdates();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRetryConnections = async () => {
    await Promise.all([loadSystemHealth(), loadModels()]);
  };

  const backendStatus = health ? 'online' : healthLoading ? 'checking' : 'offline';
  const ollamaStatus = health?.ollama.status ?? 'unknown';

  const handleInstallUpdate = async () => {
    if (!availableUpdate || installingUpdate) {
      return;
    }

    try {
      setInstallingUpdate(true);
      toast.loading('Downloading update...', { id: 'app-update' });
      await availableUpdate.downloadAndInstall();
      await availableUpdate.close();
      toast.loading('Update installed. Restarting app...', { id: 'app-update' });
      await relaunch();
    } catch (installError) {
      console.error('Failed to install update:', installError);
      toast.error('Update failed. Please try again later.', { id: 'app-update' });
    } finally {
      setInstallingUpdate(false);
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
              onClick={handleRetryConnections}
              className="text-xs bg-red-900 hover:bg-red-800 px-2 py-1 rounded"
            >
              Retry Connection
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

        <div className="mt-3 pt-3 border-t border-gray-800 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-gray-400">
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus === 'online'
                  ? 'bg-green-500'
                  : backendStatus === 'offline'
                    ? 'bg-red-500'
                    : 'bg-yellow-500 animate-pulse'
              }`}
            ></span>
            <span>
              Backend: {
                backendStatus === 'online'
                  ? 'Connected'
                  : backendStatus === 'offline'
                    ? 'Offline'
                    : 'Checking'
              }
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span
              className={`w-2 h-2 rounded-full ${
                ollamaStatus === 'ok'
                  ? 'bg-green-500'
                  : ollamaStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
              }`}
            ></span>
            <span>
              Ollama: {ollamaStatus === 'ok' ? 'Connected' : ollamaStatus === 'error' ? 'Unavailable' : 'Unknown'}
            </span>
          </div>
          {health?.ollama.status === 'error' && (
            <div className="text-[11px] text-yellow-400">
              Start Ollama, then retry connection.
            </div>
          )}
          {healthError && (
            <div className="text-[11px] text-red-400 truncate" title={healthError}>
              {healthError}
            </div>
          )}
          {(backendStatus !== 'online' || ollamaStatus === 'error') && (
            <button
              onClick={handleRetryConnections}
              className="mt-1 px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
            >
              Retry Connection
            </button>
          )}
        </div>
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
        {availableUpdate && (
          <button
            onClick={handleInstallUpdate}
            disabled={installingUpdate}
            className="w-full mb-3 px-2 py-1.5 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            title="Install available update"
          >
            {installingUpdate ? 'Installing update...' : `Update available: v${availableUpdate.version}`}
          </button>
        )}
        <div>Local AI • Ollama</div>
        <div className="mt-1">
          {models.length} model{models.length !== 1 ? 's' : ''} available
        </div>
      </div>
    </div>
  );
};
