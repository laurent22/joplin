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
import { SearchApiResult, SearchResult } from '@/lib/note';
import * as cheerio from 'cheerio';

type Props = {
  open: boolean;
  onClose: () => void;
  initialSearchInput: string;
  setQuery: (v: string) => void;
};


function SearchDialog({ open, onClose, initialSearchInput, setQuery }: Props) {
  const dialogInputRef = React.useRef<HTMLInputElement | null>(null);
  const [internalQuery, setInternalQuery] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');

  // HTMLエスケープ用のヘルパー関数
  const escapeHtml = (str: string): string => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const escapeRegExp = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      setSearchInput(initialSearchInput);
      setTimeout(() => dialogInputRef.current?.focus(), 0);
    }
  }, [open, initialSearchInput]);

  const handleSearch = () => {
    setInternalQuery(searchInput);
  };

  const handleItemClick = (item: SearchResult) => {
    setQuery(item.title);
    onClose();
  };

  const results = React.useMemo(() => {
    return searchApiResults?.data.results || [];
  }, [searchApiResults?.data.results]);

  const noteMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(searchApiResults?.data.noteMap || {}).forEach(([id, note]) => {
      const body = note.body || '';
      const $ = cheerio.load(`<root>${body}</root>`);
      const text = $.root().text();
      map[id] = text;
    });
    return map;
  }, [searchApiResults?.data.noteMap]);

  const renderResults = React.useMemo(() => {
    const queryKeywords = internalQuery.split(' ').filter(k => k.trim());
    const expandedResults: Array<{ item: SearchResult; fragment?: string; index?: number }> = [];

    const renderItem = (item: SearchResult, fragment?: string, index?: number) => {
      const note = noteMap[item.id];
      
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

    // 各検索結果に対して、queryKeywordsに含まれる部分を前後20文字と共に取得

    // 処理時間計測開始
     
    const t0 = performance.now();

    results.forEach((item) => {
      const noteText = noteMap[item.id];
      if (noteText) {
        const fragments: string[] = [];
        const fragmentSet = new Set<string>();
        
        // 各キーワードについてnoteText内のすべての出現位置を検索
        queryKeywords.forEach((keyword) => {
          if (!keyword) return;
          
          let startIndex = 0;
          while (true) {
            const index = noteText.toLowerCase().indexOf(keyword.toLowerCase(), startIndex);
            if (index === -1) break;
            
            // 前後20文字を含めて取得
            const start = Math.max(0, index - 20);
            const end = Math.min(noteText.length, index + keyword.length + 20);
            const fragment = noteText.slice(start, end);
            
            // 重複を避けるため、Set で管理
            if (!fragmentSet.has(fragment)) {
              fragmentSet.add(fragment);
              fragments.push(fragment);
            }
            
            startIndex = index + 1;
          }
        });
        
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

    // 処理時間計測終了 (ミリ秒)
     
    const t1 = performance.now();
    console.log(
      `SearchDialog: fragment extraction took ${(t1 - t0).toFixed(2)}ms for ${results.length} results and ${queryKeywords.length} keywords`
    );

    return (
      <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
        {expandedResults.map(({ item, fragment, index }) => renderItem(item, fragment, index))}
      </List>
    );
  }, [internalQuery, results, noteMap]);


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

        {!isLoading && !error && results.length > 0 && renderResults}

        {!isLoading && !error && internalQuery && results.length === 0 && (
          <Box sx={{ p: 2, textAlign: 'center', opacity: 0.6 }}>
            結果が見つかりませんでした
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

const MemoizedSearchDialog = React.memo(SearchDialog);

export default MemoizedSearchDialog;
