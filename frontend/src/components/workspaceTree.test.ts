import { describe, expect, it } from 'vitest';
import type { FileNode } from '../api';
import { findNodeByPath, withLoadedChildren } from './workspaceTree';

const createTree = (): FileNode => ({
  name: 'workspace',
  path: '/workspace',
  type: 'directory',
  children: [
    {
      name: 'src',
      path: '/workspace/src',
      type: 'directory',
    },
    {
      name: 'docs',
      path: '/workspace/docs',
      type: 'directory',
      children: [
        {
          name: 'guide.md',
          path: '/workspace/docs/guide.md',
          type: 'file',
        },
      ],
    },
    {
      name: 'README.md',
      path: '/workspace/README.md',
      type: 'file',
    },
  ],
});

describe('workspaceTree', () => {
  it('finds a nested directory by path', () => {
    const tree = createTree();
    const node = findNodeByPath(tree, '/workspace/docs');

    expect(node).not.toBeNull();
    expect(node?.name).toBe('docs');
    expect(node?.type).toBe('directory');
  });

  it('returns null for a missing path', () => {
    const tree = createTree();
    expect(findNodeByPath(tree, '/workspace/missing')).toBeNull();
  });

  it('replaces children only for the requested directory', () => {
    const tree = createTree();
    const loadedChildren: FileNode[] = [
      {
        name: 'index.ts',
        path: '/workspace/src/index.ts',
        type: 'file',
      },
      {
        name: 'lib',
        path: '/workspace/src/lib',
        type: 'directory',
      },
    ];

    const nextTree = withLoadedChildren(tree, '/workspace/src', loadedChildren);
    const srcNode = findNodeByPath(nextTree, '/workspace/src');
    const docsNode = findNodeByPath(nextTree, '/workspace/docs');
    const originalSrcNode = findNodeByPath(tree, '/workspace/src');

    expect(srcNode?.children).toEqual(loadedChildren);
    expect(docsNode?.children).toEqual([
      {
        name: 'guide.md',
        path: '/workspace/docs/guide.md',
        type: 'file',
      },
    ]);
    expect(originalSrcNode?.children).toBeUndefined();
  });
});
