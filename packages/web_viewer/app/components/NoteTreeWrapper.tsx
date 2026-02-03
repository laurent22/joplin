'use client';

import React from 'react';
import NoteTree from './NoteTree';
import SearchResult from './SearchResult';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import SearchDialog from './SearchDialog';

export default function NoteTreeWrapper() {
  const [query, setQuery] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');
  const [openSearchDialog, setOpenSearchDialog] = React.useState(false);
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
      
      <SearchDialog
        open={openSearchDialog}
        onClose={() => setOpenSearchDialog(false)}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        setQuery={setQuery}
      />
      
      <div style={{ flex: 1, minHeight: 0, display: !hideTree ? 'none' : undefined  }}>
          <SearchResult query={query} />
      </div>

        <div style={{ flex: 1, minHeight: 0, display: hideTree ? 'none' : undefined }}>
            <NoteTree />
        </div>
    </div>
  );
}
