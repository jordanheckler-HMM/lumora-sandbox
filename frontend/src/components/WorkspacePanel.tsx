import { useEffect, useState, useRef } from 'react';
import { useAppState } from '../store/appState';
import { getWorkspaceFiles, readFile } from '../api';
import type { FileNode } from '../api';
import toast from 'react-hot-toast';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    // Only auto-load if a workspace path exists (from localStorage) and not currently loading
    if (workspacePath && workspacePath.trim() && !loadingRef.current) {
      loadWorkspace();
    }
  }, [workspacePath]);

  const loadWorkspace = async () => {
    // Skip if no path is set or already loading
    if (!workspacePath || !workspacePath.trim() || loadingRef.current) {
      return;
    }

    loadingRef.current = true;

    try {
      setLoading(true);
      setError(null);
      const tree = await getWorkspaceFiles(workspacePath);
      setWorkspaceTree(tree);
      // Auto-expand root
      setExpandedDirs(new Set([tree.path]));
      // Save successfully loaded path to localStorage
      localStorage.setItem('lumora_last_workspace', workspacePath);
    } catch (err: any) {
      setError(err.message || 'Failed to load workspace');
      console.error('Error loading workspace:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
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
    } catch (error: any) {
      toast.error(`Error reading file: ${error.message}`);
    }
  };

  const toggleDirectory = (dirPath: string) => {
    const next = new Set(expandedDirs);
    if (next.has(dirPath)) {
      next.delete(dirPath);
    } else {
      next.add(dirPath);
    }
    setExpandedDirs(next);
  };

  const renderTree = (node: FileNode, level: number = 0): React.JSX.Element => {
    const isExpanded = expandedDirs.has(node.path);

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
          onClick={() => toggleDirectory(node.path)}
        >
          <span className="text-gray-500">{isExpanded ? '📂' : '📁'}</span>
          <span className="text-sm font-medium text-gray-700">{node.name}</span>
        </div>
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderTree(child, level + 1))}
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
          <input
            type="text"
            value={workspacePath}
            onChange={(e) => setWorkspacePath(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter workspace path..."
          />
          <button
            onClick={loadWorkspace}
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
                onClick={loadWorkspace}
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

