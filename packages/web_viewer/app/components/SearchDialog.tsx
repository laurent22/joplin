'use client';

import React from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useQuery } from '@tanstack/react-query';

type Props = {
  open: boolean;
  onClose: () => void;
  searchInput: string;
  setSearchInput: (v: string) => void;
  setQuery: (v: string) => void;
};

interface SearchResult {
  id: string;
  title: string;
  parent_id: string;
  fields: string[];
  fragments?: string;
  path?: string;
  type?: number;
}

export default function SearchDialog({ open, onClose, searchInput, setSearchInput, setQuery }: Props) {
  const dialogInputRef = React.useRef<HTMLInputElement | null>(null);
  const [internalQuery, setInternalQuery] = React.useState('');

  // react-queryでAPI呼び出し
  const { data, isLoading, error } = useQuery<{ success: boolean; data: SearchResult[] }>({
    queryKey: ['search', internalQuery],
    queryFn: async () => {
      if (!internalQuery) return { success: true, data: [] };
      const response = await fetch(`/api/search?query=${encodeURIComponent(internalQuery)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      return response.json();
    },
    enabled: !!internalQuery,
  });

  React.useEffect(() => {
    if (open) {
      setTimeout(() => dialogInputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSearch = () => {
    setInternalQuery(searchInput);
  };

  const handleItemClick = (item: SearchResult) => {
    setQuery(item.title);
    onClose();
  };

  const results = data?.data || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>検索</DialogTitle>
      <DialogContent>
        <TextField
          variant="outlined"
          size="small"
          placeholder="検索..."
          inputRef={dialogInputRef}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              handleSearch();
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          fullWidth
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchInput ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setSearchInput(''); setInternalQuery(''); }}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />

        {/* 検索結果表示 */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2, color: 'error.main' }}>
            検索中にエラーが発生しました
          </Box>
        )}

        {!isLoading && !error && results.length > 0 && (
          <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
            {results.map((item) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton onClick={() => handleItemClick(item)}>
                  <ListItemText
                    primary={item.title}
                    secondary={
                      <>
                        {item.fragments && <Box sx={{ mb: 0.5, opacity: 0.7 }}>{item.fragments}</Box>}
                        {item.path && <Box sx={{ fontSize: '0.875rem', opacity: 0.6 }}>{item.path}</Box>}
                      </>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}

        {!isLoading && !error && internalQuery && results.length === 0 && (
          <Box sx={{ p: 2, textAlign: 'center', opacity: 0.6 }}>
            結果が見つかりませんでした
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
