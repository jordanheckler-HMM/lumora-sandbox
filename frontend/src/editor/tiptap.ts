import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { useMemo } from 'react';

// Debounce utility
const debounce = <Args extends unknown[]>(
  func: (...args: Args) => void,
  delay: number
): ((...args: Args) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const useTipTapEditor = (content: string, onUpdate: (content: string) => void) => {
  // Debounce the update callback to reduce re-renders
  const debouncedUpdate = useMemo(
    () => debounce((text: string) => onUpdate(text), 300),
    [onUpdate]
  );
  
  return useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline cursor-pointer',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-full p-8 text-gray-100',
      },
    },
    onUpdate: ({ editor }) => {
      debouncedUpdate(editor.getHTML());
    },
  });
};
