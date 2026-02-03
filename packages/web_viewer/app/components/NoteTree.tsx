 'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DescriptionIcon from '@mui/icons-material/Description';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { NoteEntity } from '@/lib/database';
import { useAppDispatch } from '@/lib/hooks';
import { setSelectedNote } from '@/lib/features/selectedNoteSlice';

type TreeNode = FolderNode | NoteNode;

interface FolderNode {
  id: string;
  title: string;
  parent_id: string;
  updated_time: number;
  created_time: number;
  type: 'Folder';
  children: TreeNode[];
}

interface NoteNode {
  id: string;
  title: string;
  parent_id: string;
  updated_time: number;
  created_time: number;
  type: 'Note';
  metadata: NoteEntity;
}

interface ApiResponse {
  success: boolean;
  data?: TreeNode[];
  error?: string;
  message?: string;
}

async function fetchFolders(): Promise<TreeNode[]> {
  const response = await fetch('/api/tree');
  const json: ApiResponse = await response.json();
  
  if (!json.success) {
    throw new Error(json.message || 'Failed to fetch folders');
  }
  
  return json.data || [];
}
function renderTree(nodes: TreeNode[], onNoteDouble?: (node: NoteNode) => void) {
  return nodes.map((node) => {
    if (node.type === 'Folder') {
      return (
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
          {node.children && node.children.length > 0 && renderTree(node.children, onNoteDouble)}
        </TreeItem>
      );
    }

    // Note node (leaf)
    return (
      <TreeItem
        key={node.id}
        itemId={node.id}
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DescriptionIcon fontSize="small" sx={{ color: 'rgba(0,0,0,0.6)' }} />
            <span>{node.title}</span>
          </Box>
        }
        onDoubleClick={() => onNoteDouble && onNoteDouble(node as NoteNode)}
      />
    );
  });
}

function collectIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    if (node.type === 'Folder' && node.children && node.children.length > 0) {
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

  const dispatch = useAppDispatch();

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
        {renderTree(folders, (n) => dispatch(setSelectedNote(n.metadata)))}
      </SimpleTreeView>
    </Box>
  );
}
