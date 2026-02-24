import { useRef, useEffect } from 'react';
import { EditorContent } from '@tiptap/react';
import { useTipTapEditor } from '../editor/tiptap';
import { DocumentToolbar } from './DocumentToolbar';
import { DocumentAIBar } from './DocumentAIBar';
import { RightSidebar } from './documents/RightSidebar';
import type { SidebarTab } from './documents/RightSidebar';
import { downloadBlob, exportToTxt, readTxt, readMd, readRtf } from '../utils/documentUtils';
import { useAppState } from '../store/appState';
import { registerGlobalHandler, unregisterGlobalHandler } from '../utils/globalHandlers';
import toast from 'react-hot-toast';

export const DocumentsTab = () => {
  // Phase 1: Use global app state - document content persists across tab switches
  const { selectedModel, documentState, setDocumentState, sidebarState, setSidebarState } = useAppState();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract sidebar state for documents
  const sidebarOpen = sidebarState.documentsTabOpen;
  const sidebarTab = sidebarState.documentSidebarTab as SidebarTab;

  const setSidebarOpen = (open: boolean) => {
    setSidebarState({ documentsTabOpen: open });
  };

  const setSidebarTab = (tab: SidebarTab) => {
    setSidebarState({ documentSidebarTab: tab });
  };

  const handleContentUpdate = (newContent: string) => {
    setDocumentState({
      content: newContent,
      isModified: true,
    });
  };

  const editor = useTipTapEditor(documentState.content, handleContentUpdate);

  const handleNewDocument = () => {
    if (documentState.isModified) {
      const confirm = window.confirm('You have unsaved changes. Continue without saving?');
      if (!confirm) return;
    }

    setDocumentState({
      title: 'Untitled Document',
      content: '',
      isModified: false,
    });

    editor?.commands.setContent('');
  };

  const handleOpenDocument = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let content = '';
      const ext = file.name.split('.').pop()?.toLowerCase();

      switch (ext) {
        case 'txt':
          content = await readTxt(file);
          break;
        case 'md':
          content = await readMd(file);
          break;
        case 'rtf':
          content = await readRtf(file);
          break;
        default:
          toast.error('Unsupported file format. Please use .txt, .md, or .rtf');
          return;
      }

      // Set document title from filename (without extension)
      const titleWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      
      setDocumentState({
        title: titleWithoutExt,
        content,
        isModified: false,
      });

      editor?.commands.setContent(content);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to open document');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveDocument = () => {
    if (!editor) return;

    const content = editor.getText();
    const filename = `${documentState.title || 'Untitled'}.txt`;
    const blob = exportToTxt(content);
    
    downloadBlob(blob, filename);

    setDocumentState({ isModified: false });
  };

  const handleTitleChange = (newTitle: string) => {
    setDocumentState({
      title: newTitle,
      isModified: true,
    });
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleOpenSidebar = (tab: SidebarTab = 'ai') => {
    setSidebarTab(tab);
    setSidebarOpen(true);
  };
  
  // Register global handler for document sidebar
  useEffect(() => {
    registerGlobalHandler('documentSidebar', () => handleOpenSidebar('ai'));
    return () => unregisterGlobalHandler('documentSidebar');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- register once on mount

  return (
    <div className="flex h-full bg-gray-50 relative">
      {/* Main document area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.rtf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Toolbar */}
        <DocumentToolbar
          editor={editor}
          documentTitle={documentState.title}
          onTitleChange={handleTitleChange}
          onNewDocument={handleNewDocument}
          onOpenDocument={handleOpenDocument}
          onSaveDocument={handleSaveDocument}
          onToggleSidebar={handleToggleSidebar}
          sidebarOpen={sidebarOpen}
        />

        {/* AI Editing Bar */}
        <DocumentAIBar
          editor={editor}
          currentModel={selectedModel}
        />

        {/* Editor Controls */}
      {editor && (
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              editor.isActive('bold')
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              editor.isActive('italic')
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              editor.isActive('underline')
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Underline"
          >
            <u>U</u>
          </button>

          <div className="w-px h-6 bg-gray-600 mx-1"></div>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              editor.isActive('heading', { level: 1 })
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Heading 1"
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Heading 2"
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Heading 3"
          >
            H3
          </button>

          <div className="w-px h-6 bg-gray-600 mx-1"></div>

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              editor.isActive('bulletList')
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Bullet List"
          >
            • List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              editor.isActive('orderedList')
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Numbered List"
          >
            1. List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              editor.isActive('codeBlock')
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Code Block"
          >
            {'</>'}
          </button>

          <div className="w-px h-6 bg-gray-600 mx-1"></div>

          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="px-2 py-1 text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            ↶ Undo
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="px-2 py-1 text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            ↷ Redo
          </button>
        </div>
      )}

        {/* Editor Content */}
        <div className="flex-1 overflow-auto bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <RightSidebar
        key={`doc-sidebar-${sidebarTab}-${sidebarOpen ? 'open' : 'closed'}`}
        editor={editor}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        initialTab={sidebarTab}
      />
    </div>
  );
};
