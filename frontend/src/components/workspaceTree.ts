import type { FileNode } from '../api';

export const findNodeByPath = (node: FileNode, targetPath: string): FileNode | null => {
  if (node.path === targetPath) {
    return node;
  }

  if (!node.children) {
    return null;
  }

  for (const child of node.children) {
    if (child.type !== 'directory') {
      continue;
    }
    const match = findNodeByPath(child, targetPath);
    if (match) {
      return match;
    }
  }

  return null;
};

export const withLoadedChildren = (node: FileNode, targetPath: string, children: FileNode[]): FileNode => {
  if (node.path === targetPath) {
    return {
      ...node,
      children,
    };
  }

  if (!node.children) {
    return node;
  }

  return {
    ...node,
    children: node.children.map((child) => {
      if (child.type !== 'directory') {
        return child;
      }
      return withLoadedChildren(child, targetPath, children);
    }),
  };
};
