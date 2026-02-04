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
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useQuery } from '@tanstack/react-query';
import { SearchResult } from '@/lib/note';

type Props = {
  open: boolean;
  onClose: () => void;
  searchInput: string;
  setSearchInput: (v: string) => void;
  setQuery: (v: string) => void;
};


export default function SearchDialog({ open, onClose, searchInput, setSearchInput, setQuery }: Props) {
  const dialogInputRef = React.useRef<HTMLInputElement | null>(null);
  const [internalQuery, setInternalQuery] = React.useState('');

  // offsets文字列を解析してフラグメントを生成する関数
  const extractFragments = (body: string, offsets: string): string => {
    if (!body || !offsets) return '';
    
    try {
      // offsetsは "column offset length column offset length ..." の形式
      const parts = offsets.split(' ').map(Number);
      const matches: Array<{ offset: number; length: number }> = [];
      
      // column 2 がbody列なので、それに対応するoffset/lengthを抽出
      for (let i = 0; i < parts.length; i += 4) {
        const column = parts[i];
        const offset = parts[i + 2];
        const length = parts[i + 3];
        if (column === 2) { // bodyは3列目（0始まりで2）
          matches.push({ offset, length });
        }
      }
      
      if (matches.length === 0) return '';
      
      // 最初のマッチ箇所の前後を取得
      const firstMatch = matches[0];
      const contextLength = 100;
      const start = Math.max(0, firstMatch.offset - contextLength);
      const end = Math.min(body.length, firstMatch.offset + firstMatch.length + contextLength);
      
      let fragment = body.substring(start, end);
      if (start > 0) fragment = '...' + fragment;
      if (end < body.length) fragment = fragment + '...';
      
      // マッチ部分をハイライト
      let result = fragment;
      matches.forEach(match => {
        const matchText = body.substring(match.offset, match.offset + match.length);
        const regex = new RegExp(`(${escapeRegExp(matchText)})`, 'gi');
        result = result.replace(regex, '<span style="font-weight: bold; color: #1976d2;">$1</span>');
      });
      
      return result;
    } catch (e) {
      return '';
    }
  };
  
  const escapeRegExp = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  
  // キーワードをハイライトするヘルパー関数
  const surroundKeywords = (keywords: string, text: string, prefix: string, suffix: string): string => {
    if (!keywords || !text) return text;
    const keywordArray = keywords.split(' ').filter(k => k.trim());
    let result = text;
    keywordArray.forEach(keyword => {
      const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
      result = result.replace(regex, `${prefix}$1${suffix}`);
    });
    return result;
  };

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

  const renderItem = (item: SearchResult) => {
    const titleHtml = surroundKeywords(internalQuery, item.title, '<span style="font-weight: bold; color: #1976d2;">', '</span>');
    const fragmentHtml = extractFragments(item.body, item.offsets);

    return (
      <ListItem key={item.id} disablePadding>
        <ListItemButton onClick={() => handleItemClick(item)} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1.5 }}>
          <Box dangerouslySetInnerHTML={{ __html: titleHtml }} sx={{ fontSize: '1rem', mb: 0.5 }} />
          {fragmentHtml && (
            <Box 
              dangerouslySetInnerHTML={{ __html: fragmentHtml }} 
              sx={{ fontSize: '0.875rem', opacity: 0.7, mb: 0.5, whiteSpace: 'pre-wrap' }} 
            />
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  const renderList = () => {
    return (
      <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
        {results.map((item) => renderItem(item))}
      </List>
    );
  };

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

        {!isLoading && !error && results.length > 0 && renderList()}

        {!isLoading && !error && internalQuery && results.length === 0 && (
          <Box sx={{ p: 2, textAlign: 'center', opacity: 0.6 }}>
            結果が見つかりませんでした
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
