'use client';

import React from 'react';
import NoteTree from './NoteTree';
import SearchResult from './SearchResult';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

export default function NoteTreeWrapper() {
  const [query, setQuery] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');
  const [openSearchDialog, setOpenSearchDialog] = React.useState(false);
  const dialogInputRef = React.useRef<HTMLInputElement | null>(null);

  const hideTree = query && query.trim() !== '';

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      // Cmd+P on mac (metaKey) or Ctrl+P on other platforms
      if ((e.metaKey || e.ctrlKey) && key === 'p') {
        e.preventDefault();
        setOpenSearchDialog(true);
        // populate dialog input with current query
        setSearchInput(query);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [query]);

  React.useEffect(() => {
    if (openSearchDialog) {
      // focus the dialog input on open
      setTimeout(() => dialogInputRef.current?.focus(), 0);
    }
  }, [openSearchDialog]);

  return (
    <div className="note-tree-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ paddingBottom: 8 }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="検索..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              setQuery(searchInput);
            }
          }}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchInput ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setSearchInput(''); setQuery(''); }}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
          inputProps={{ 'aria-label': 'Search notes' }}
        />
      </div>
      
      <Dialog open={openSearchDialog} onClose={() => setOpenSearchDialog(false)} maxWidth="sm" fullWidth>
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
                setQuery(searchInput);
                setOpenSearchDialog(false);
              } else if (e.key === 'Escape') {
                setOpenSearchDialog(false);
              }
            }}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => { setSearchInput(''); setQuery(''); setOpenSearchDialog(false); }}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            }}
          />
        </DialogContent>
      </Dialog>
      
      <div style={{ flex: 1, minHeight: 0, display: !hideTree ? 'none' : undefined  }}>
          <SearchResult query={query} />
      </div>

        <div style={{ flex: 1, minHeight: 0, display: hideTree ? 'none' : undefined }}>
            <NoteTree />
        </div>
    </div>
  );
}
