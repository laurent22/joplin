'use client';

import React from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DescriptionIcon from '@mui/icons-material/Description';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Link from 'next/link';
import { useFolderQuery } from '@/lib/hooks';
import { FolderTreeNode, NoteTreeNode, TreeNode, ViewerUtil } from '@/lib/viewerUtil';
import { NoteEntity } from '@/lib/database';


const searchMatchedNotes = (query: string, folders: TreeNode[]): NoteEntity[] => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    const results: NoteEntity[] = [];
    const seen = new Set<string>();

    const traverse = (nodes: TreeNode[] | undefined) => {
      if (!nodes || nodes.length === 0) return;
      for (const node of nodes) {
        if ((node as NoteTreeNode).type === 'Note') {
          const noteNode = node as NoteTreeNode;
          const title = (noteNode.title || '').toLowerCase();
          if (title.includes(q)) {
            const id = noteNode.metadata?.id || noteNode.id;
            if (!seen.has(id) && noteNode.metadata) {
              results.push(noteNode.metadata);
              seen.add(id);
            }
          }
        } else {
          // Folder node: recurse into children
          const folderNode = node as FolderTreeNode;
          traverse(folderNode.children);
        }
      }
    };

    traverse(folders);
    return results;
  }


export default function SearchResult({ query }: { query: string }) {
  const [results, setResults] = React.useState<NoteEntity[] | null>(null);
  const {folders, isLoading, error} = useFolderQuery()

   
  React.useEffect(() => {
    if (!query || query.trim() === '') {
      setResults(null);
      return;
    }
    if (!folders) {
      setResults([]);
      return;
    }
    const result = searchMatchedNotes(query, folders);
    setResults(result);
  }, [query, folders]);

  if (isLoading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
      <CircularProgress />
    </Box>
  );


  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!results || results.length === 0) return <Alert severity="info">No results</Alert>;

  return (
    <Box sx={{ height: '100%', overflowY: 'auto' }}>
      <List>
        {results.map((r) => (
          <ListItem key={r.id} disablePadding>
            <Link href={`/note?note_id=${r.id}`}>
              <ListItemButton>
                <ListItemIcon>
                  <DescriptionIcon />
                </ListItemIcon>
                <ListItemText primary={r.title || '(no title)'} />
              </ListItemButton>
            </Link>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
