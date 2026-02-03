'use client';

import React from 'react';
import NoteTree from './NoteTree';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

export default function NoteTreeWrapper() {
  const [query, setQuery] = React.useState('');

  return (
    <div className="note-tree-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ paddingBottom: 8 }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setQuery('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
          inputProps={{ 'aria-label': 'Search notes' }}
        />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <NoteTree />
      </div>
    </div>
  );
}
