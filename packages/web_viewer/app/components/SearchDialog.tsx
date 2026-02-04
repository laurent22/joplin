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
import { SearchApiResult, SearchResult } from '@/lib/note';;

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

  // HTMLエスケープ用のヘルパー関数
  const escapeHtml = (str: string): string => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const escapeRegExp = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // 次の空白のインデックスを取得
  const nextWhitespaceIndex = (str: string, startIndex: number): number => {
    const match = str.substring(startIndex).match(/\s/);
    return match ? startIndex + match.index : str.length;
  };

  // ダイアクリティカルマークを削除（アクセント記号など）
  const removeDiacritics = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  // GotoAnythingと同じsurroundKeywords実装
  const surroundKeywords = (keywords: string[], text: string, prefix: string, suffix: string, options: { escapeHtml?: boolean } = {}): string => {
    if (!keywords || keywords.length === 0 || !text) return options.escapeHtml ? escapeHtml(text) : text;
    
    let result = options.escapeHtml ? escapeHtml(text) : text;
    
    keywords.forEach(keyword => {
      if (!keyword) return;
      const escapedKeyword = escapeRegExp(keyword);
      const regex = new RegExp(`(${escapedKeyword})`, 'gi');
      result = result.replace(regex, `${prefix}$1${suffix}`);
    });
    
    return result;
  };

  // offsets文字列を解析してフラグメントを生成する関数（GotoAnythingスタイル）
  const extractFragments = (body: string, offsets: string, queryKeywords: string[]): string[] => {
    if (!body || !offsets) return [];
    
    try {
      // offsetsは "column offset length column offset length ..." の形式
      const parts = offsets.split(' ').map(Number);
      const indices: Array<[number, number]> = [];
      
      // column 2 がbody列なので、それに対応するoffset/lengthを抽出
      for (let i = 0; i < parts.length; i += 4) {
        const column = parts[i];
        const offset = parts[i + 2];
        const length = parts[i + 3];
        if (column === 2) { // bodyは3列目（0始まりで2）
          const matchIndex = offset;
          const endIndex = nextWhitespaceIndex(body, offset + length + 15);
          indices.push([matchIndex, endIndex]);
          if (indices.length > 20) break;
        }
      }
      
      if (indices.length === 0) return [];
      
      // 各マッチ箇所からフラグメントを生成
      const fragments: string[] = [];
      const exists: Record<string, boolean> = {};
      
      for (const [start, end] of indices) {
        const fragment = body.slice(start, end);
        if (fragment.length > 0 && !exists[fragment]) {
          exists[fragment] = true;
          fragments.push(fragment);
        }
      }
      
      return fragments;
    } catch (e) {
      console.error('Fragment extraction error:', e);
      return [];
    }
  };

  // react-queryでAPI呼び出し
  const { data: searchApiResults, isLoading, error } = useQuery<{ success: boolean; data: SearchApiResult }>({
    queryKey: ['search', internalQuery],
    queryFn: async () => {
      if (!internalQuery) return { success: true, data: {
        results: [],
        noteMap: {},
      } };
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

  const results = searchApiResults?.data.results || [];
  const noteMap = searchApiResults?.data.noteMap || {};

  const renderItem = (item: SearchResult, fragment?: string, index?: number) => {
    const note = noteMap[item.id];
    const queryKeywords = internalQuery.split(' ').filter(k => k.trim());
    
    // フラグメントがある場合はタイトルを太字でカラー表示、ない場合はキーワードハイライト
    const titleHtml = fragment
      ? `<span style="font-weight: bold; color: #1976d2;">${escapeHtml(item.title)}</span>`
      : surroundKeywords(queryKeywords, item.title, '<span style="font-weight: bold; color: #1976d2;">', '</span>', { escapeHtml: true });

    // フラグメントをキーワードでハイライト
    const fragmentHtml = fragment
      ? surroundKeywords(queryKeywords, fragment, '<span style="font-weight: bold; color: #1976d2;">', '</span>', { escapeHtml: true })
      : null;

    const key = index !== undefined ? `${item.id}-${index}` : item.id;

    return (
      <ListItem key={key} disablePadding>
        <ListItemButton 
          onClick={() => handleItemClick(item)} 
          sx={{ 
            flexDirection: 'column', 
            alignItems: 'flex-start', 
            py: 1.5,
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            minHeight: fragment ? '84px' : '64px',
          }}
        >
          <Box 
            dangerouslySetInnerHTML={{ __html: titleHtml }} 
            sx={{ 
              fontSize: '1.125rem', 
              mb: fragment ? 0.75 : 0.5,
              opacity: 0.85,
            }} 
          />
          {fragmentHtml && (
            <Box 
              dangerouslySetInnerHTML={{ __html: fragmentHtml }} 
              sx={{ 
                fontSize: '0.95rem', 
                opacity: 0.7, 
                mb: 0.5, 
                whiteSpace: 'pre-wrap',
                lineHeight: 1.4,
              }} 
            />
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  const renderList = () => {
    const queryKeywords = internalQuery.split(' ').filter(k => k.trim());
    const expandedResults: Array<{ item: SearchResult; fragment?: string; index?: number }> = [];

    // GotoAnythingと同じように、各フラグメントを個別の結果として展開
    results.forEach((item) => {
      const note = noteMap[item.id];
      if (note?.body && item.offsets) {
        const fragments = extractFragments(note.body, item.offsets, queryKeywords);
        if (fragments.length > 0) {
          fragments.forEach((fragment, idx) => {
            expandedResults.push({ item, fragment, index: idx });
          });
        } else {
          // フラグメントがない場合はタイトルのみ表示
          expandedResults.push({ item });
        }
      } else {
        // bodyがない場合はタイトルのみ表示
        expandedResults.push({ item });
      }
    });

    return (
      <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
        {expandedResults.map(({ item, fragment, index }) => renderItem(item, fragment, index))}
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
