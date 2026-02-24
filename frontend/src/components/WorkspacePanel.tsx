import { useCallback, useEffect, useState, useRef } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppState } from '../store/appState';
import { getWorkspaceFiles, readFile } from '../api';
import type { FileNode } from '../api';
import { findNodeByPath, withLoadedChildren } from './workspaceTree';
import toast from 'react-hot-toast';

const RECENT_WORKSPACES_KEY = 'lumora_recent_workspaces';
const MAX_RECENT_WORKSPACES = 5;

const loadRecentWorkspaces = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const saved = localStorage.getItem(RECENT_WORKSPACES_KEY);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((path) => typeof path === 'string') : [];
  } catch {
    return [];
  }
};

const getWorkspaceLabel = (path: string): string => {
  const segments = path.split(/[\\/]/).filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : path;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error ? error.message : fallback;
};

export const WorkspacePanel = () => {
  // Phase 1: Use global app state - workspace path and expansion state persist
  const {
    workspaceTree,
    setWorkspaceTree,
    setCodeFileContent,
    setOpenCodeFile,
    setActiveTab,
    addToolOutput,
    workspacePath,
    setWorkspacePath,
    expandedDirs,
    setExpandedDirs,
  } = useAppState();
  const pickerAvailable = isTauri();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceInput, setWorkspaceInput] = useState(workspacePath);
  const [recentWorkspaces, setRecentWorkspaces] = useState<string[]>(() => loadRecentWorkspaces());
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const loadingRef = useRef(false);

  const loadWorkspace = useCallback(async (pathToLoad: string) => {
    const normalizedPath = pathToLoad.trim();

    // Skip if no path is set or already loading
    if (!normalizedPath || loadingRef.current) {
      return;
    }

    loadingRef.current = true;

    try {
      setLoading(true);
      setError(null);
      const tree = await getWorkspaceFiles(normalizedPath);
      setWorkspaceTree(tree);
      // Auto-expand root
      setExpandedDirs(new Set([tree.path]));
      setLoadingDirs(new Set());

      if (typeof window !== 'undefined') {
        // Save successfully loaded path to localStorage
        localStorage.setItem('lumora_last_workspace', normalizedPath);
      }

      setRecentWorkspaces((current) => {
        const updated = [normalizedPath, ...current.filter((path) => path !== normalizedPath)]
          .slice(0, MAX_RECENT_WORKSPACES);

        if (typeof window !== 'undefined') {
          localStorage.setItem(RECENT_WORKSPACES_KEY, JSON.stringify(updated));
        }

        return updated;
      });
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to load workspace'));
      console.error('Error loading workspace:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [setExpandedDirs, setWorkspaceTree]);

  useEffect(() => {
    setWorkspaceInput(workspacePath);
  }, [workspacePath]);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    if (!workspacePath.trim()) {
      setWorkspacePath('~');
    }
  }, [workspacePath, setWorkspacePath]);

  useEffect(() => {
    // Auto-load committed workspace path (from localStorage, picker, or manual load)
    if (workspacePath && workspacePath.trim() && !loadingRef.current) {
      loadWorkspace(workspacePath);
    }
  }, [workspacePath, loadWorkspace]);

  const handleLoadWorkspace = () => {
    const nextPath = workspaceInput.trim();
    if (!nextPath) {
      toast.error('Select a workspace folder first.');
      return;
    }

    if (nextPath === workspacePath.trim()) {
      loadWorkspace(nextPath);
      return;
    }

    setWorkspacePath(nextPath);
  };

  const handleChooseWorkspace = async () => {
    if (!pickerAvailable) {
      toast.error('Folder picker is only available in the desktop app.');
      return;
    }

    try {
      const selection = await open({
        directory: true,
        multiple: false,
        title: 'Select workspace folder',
        defaultPath: workspacePath || undefined,
      });

      if (!selection || typeof selection !== 'string') {
        return;
      }

      setWorkspaceInput(selection);
      if (selection === workspacePath.trim()) {
        loadWorkspace(selection);
      } else {
        setWorkspacePath(selection);
      }
    } catch (pickerError) {
      toast.error(getErrorMessage(pickerError, 'Failed to open folder picker.'));
    }
  };

  const handleRecentWorkspaceSelect = (selectedPath: string) => {
    if (!selectedPath) {
      return;
    }

    setWorkspaceInput(selectedPath);
    if (selectedPath === workspacePath.trim()) {
      loadWorkspace(selectedPath);
    } else {
      setWorkspacePath(selectedPath);
    }
  };

  const handleFileClick = async (filePath: string) => {
    try {
      const result = await readFile(filePath);
      setCodeFileContent(result.content);
      setOpenCodeFile(result.path);
      addToolOutput({
        type: 'read',
        data: { path: result.path, size: result.size },
      });
      setActiveTab('code');
    } catch (error) {
      toast.error(`Error reading file: ${getErrorMessage(error, 'Unknown error')}`);
    }
  };

  const setDirectoryLoading = (dirPath: string, isLoading: boolean) => {
    setLoadingDirs((current) => {
      const next = new Set(current);
      if (isLoading) {
        next.add(dirPath);
      } else {
        next.delete(dirPath);
      }
      return next;
    });
  };

  const loadDirectoryChildren = async (dirPath: string) => {
    const currentTree = useAppState.getState().workspaceTree;
    if (!currentTree) {
      return;
    }

    const node = findNodeByPath(currentTree, dirPath);
    if (!node || node.type !== 'directory') {
      return;
    }

    // Already loaded at least once.
    if (Array.isArray(node.children)) {
      return;
    }

    setDirectoryLoading(dirPath, true);
    try {
      const tree = await getWorkspaceFiles(dirPath);
      const children = tree.type === 'directory' && Array.isArray(tree.children) ? tree.children : [];
      const latestTree = useAppState.getState().workspaceTree;

      if (!latestTree) {
        return;
      }

      setWorkspaceTree(withLoadedChildren(latestTree, dirPath, children));
    } catch (directoryError) {
      toast.error(`Failed to load folder: ${getErrorMessage(directoryError, 'Unknown error')}`);
      const updatedExpanded = new Set(useAppState.getState().expandedDirs);
      updatedExpanded.delete(dirPath);
      setExpandedDirs(updatedExpanded);
    } finally {
      setDirectoryLoading(dirPath, false);
    }
  };

  const toggleDirectory = async (dirPath: string) => {
    if (loadingDirs.has(dirPath)) {
      return;
    }

    const updatedExpanded = new Set(useAppState.getState().expandedDirs);
    if (updatedExpanded.has(dirPath)) {
      updatedExpanded.delete(dirPath);
      setExpandedDirs(updatedExpanded);
      return;
    }

    updatedExpanded.add(dirPath);
    setExpandedDirs(updatedExpanded);
    await loadDirectoryChildren(dirPath);
  };

  const renderTree = (node: FileNode, level: number = 0): React.JSX.Element => {
    const isExpanded = expandedDirs.has(node.path);
    const isDirectoryLoading = loadingDirs.has(node.path);

    if (node.type === 'file') {
      return (
        <div
          key={node.path}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 cursor-pointer rounded"
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => handleFileClick(node.path)}
        >
          <span className="text-gray-500">📄</span>
          <span className="text-sm text-gray-700">{node.name}</span>
        </div>
      );
    }

    return (
      <div key={node.path}>
        <div
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 cursor-pointer rounded"
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => {
            void toggleDirectory(node.path);
          }}
        >
          <span className="text-gray-500">
            {isDirectoryLoading ? '⏳' : isExpanded ? '📂' : '📁'}
          </span>
          <span className="text-sm font-medium text-gray-700">{node.name}</span>
        </div>
        {isExpanded && isDirectoryLoading && (
          <div
            className="px-3 py-1 text-xs text-gray-500"
            style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }}
          >
            Loading folder...
          </div>
        )}
        {isExpanded && node.children && node.children.length > 0 && (
          <div>
            {node.children.map((child) => renderTree(child, level + 1))}
          </div>
        )}
        {isExpanded && Array.isArray(node.children) && node.children.length === 0 && !isDirectoryLoading && (
          <div
            className="px-3 py-1 text-xs text-gray-400 italic"
            style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }}
          >
            Empty folder
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-800">Workspace</h2>
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleChooseWorkspace}
            disabled={!pickerAvailable}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            title={pickerAvailable ? 'Choose workspace folder' : 'Available in desktop app only'}
          >
            Choose Folder
          </button>
          {recentWorkspaces.length > 0 && (
            <select
              className="min-w-40 text-sm border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              defaultValue=""
              onChange={(e) => {
                handleRecentWorkspaceSelect(e.target.value);
                e.currentTarget.value = '';
              }}
            >
              <option value="">Recent...</option>
              {recentWorkspaces.map((path) => (
                <option key={path} value={path}>
                  {getWorkspaceLabel(path)}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={workspaceInput}
            onChange={(e) => setWorkspaceInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleLoadWorkspace();
              }
            }}
            className="flex-1 text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Workspace path (auto-filled from folder picker)..."
          />
          <button
            onClick={handleLoadWorkspace}
            className="px-4 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
          >
            Load
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="animate-spin text-3xl mb-2">⚙️</div>
              <div>Loading workspace...</div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            <div className="text-center">
              <div className="text-3xl mb-2">⚠️</div>
              <div>{error}</div>
              <button
                onClick={() => loadWorkspace(workspacePath)}
                className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : workspaceTree ? (
          <div className="space-y-0.5">
            {renderTree(workspaceTree)}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">📁</div>
              <div className="text-xl font-semibold">No workspace loaded</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
