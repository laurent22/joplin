'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';

interface FolderTreeNode {
  id: string;
  title: string;
  parent_id: string;
  updated_time: number;
  created_time: number;
  children: FolderTreeNode[];
}

interface ApiResponse {
  success: boolean;
  data?: FolderTreeNode[];
  error?: string;
  message?: string;
}

async function fetchFolders(): Promise<FolderTreeNode[]> {
  const response = await fetch('/api/tree');
  const json: ApiResponse = await response.json();
  
  if (!json.success) {
    throw new Error(json.message || 'Failed to fetch folders');
  }
  
  return json.data || [];
}

function renderTree(nodes: FolderTreeNode[]) {
  return nodes.map((node) => (
    <TreeItem
      key={node.id}
      itemId={node.id}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderIcon fontSize="small" sx={{ color: '#F3C13A' }} />
          <span>{node.title}</span>
        </Box>
      }
    >
      {node.children.length > 0 && renderTree(node.children)}
    </TreeItem>
  ));
}

function collectIds(nodes: FolderTreeNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    if (node.children && node.children.length > 0) {
      ids.push(...collectIds(node.children));
    }
  }
  return ids;
}

export default function NoteTree() {
  const { data: folders, isLoading, error } = useQuery({
    queryKey: ['folders'],
    queryFn: fetchFolders,
  });

  const allIds = React.useMemo(() => collectIds(folders || []), [folders]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error loading folders: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  if (!folders || folders.length === 0) {
    return (
      <Alert severity="info">
        No folders found
      </Alert>
    );
  }

  

  return (
    <Box sx={{ height: '100%' }}>
      <SimpleTreeView
        aria-label="folder tree"
        slots={{
          collapseIcon: ExpandMoreIcon,
          expandIcon: ChevronRightIcon,
        }}
        sx={{ height: '100%', overflowY: 'auto' }}
        defaultExpandedItems={allIds}
      >
        {renderTree(folders)}
      </SimpleTreeView>
    </Box>
  );
}
