import { useState, useEffect } from 'react';
import type { Editor } from '@tiptap/react';

interface HeadingItem {
  level: 1 | 2 | 3 | 4;
  text: string;
  pos: number;
}

interface OutlinePanelProps {
  editor: Editor | null;
}

export const OutlinePanel = ({ editor }: OutlinePanelProps) => {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);

  useEffect(() => {
    if (!editor) return;

    const updateOutline = () => {
      const items: HeadingItem[] = [];
      
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          items.push({
            level: node.attrs.level as 1 | 2 | 3 | 4,
            text: node.textContent,
            pos,
          });
        }
      });

      setHeadings(items);
    };

    // Update outline on editor changes
    updateOutline();
    editor.on('update', updateOutline);

    return () => {
      editor.off('update', updateOutline);
    };
  }, [editor]);

  const scrollToHeading = (pos: number) => {
    if (!editor) return;
    
    // Set cursor position and focus
    editor.chain().focus().setTextSelection(pos).run();
    
    // Scroll editor into view (the cursor position)
    const editorElement = editor.view.dom;
    const cursorElement = editorElement.querySelector('.ProseMirror-focused');
    if (cursorElement) {
      cursorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const getIndentClass = (level: number) => {
    const indents: Record<number, string> = {
      1: 'pl-2',
      2: 'pl-6',
      3: 'pl-10',
      4: 'pl-14',
    };
    return indents[level] || 'pl-2';
  };

  const getFontSizeClass = (level: number) => {
    const sizes: Record<number, string> = {
      1: 'text-sm font-bold',
      2: 'text-sm font-semibold',
      3: 'text-xs font-medium',
      4: 'text-xs',
    };
    return sizes[level] || 'text-xs';
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="font-semibold text-gray-900 text-sm">Document Outline</h3>
        <p className="text-xs text-gray-500 mt-1">
          Click to navigate to headings
        </p>
      </div>

      {/* Headings list */}
      <div className="flex-1 overflow-y-auto p-2">
        {headings.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <div className="text-4xl mb-2">📑</div>
            <div className="text-sm">No headings yet</div>
            <div className="text-xs mt-1">
              Use H1, H2, H3, H4 to create structure
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {headings.map((heading, index) => (
              <button
                key={index}
                onClick={() => scrollToHeading(heading.pos)}
                className={`w-full text-left py-2 px-2 hover:bg-white rounded transition-colors ${getIndentClass(
                  heading.level
                )} ${getFontSizeClass(heading.level)}`}
              >
                <span className="text-gray-400 mr-2">
                  {heading.level === 1 && '▶'}
                  {heading.level === 2 && '▸'}
                  {heading.level === 3 && '•'}
                  {heading.level === 4 && '◦'}
                </span>
                <span className="text-gray-700">{heading.text || '(Empty heading)'}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

