'use client';

import { Suspense, useState } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import NoteTreeWrapper from '../components/NoteTreeWrapper';
import ReactQueryProvider from '../components/ReactQueryProvider';
import NoteViewer from '../components/NoteViewer';
import NoteEditor from '../components/NoteEditor';
import { Stack, Switch, Typography, Paper, Button, CircularProgress, Alert } from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PreviewIcon from '@mui/icons-material/Preview';
import SyncIcon from '@mui/icons-material/Sync';

export default function NotePage() {
  const [mode, setMode] = useState<'viewer' | 'editor'>('viewer');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const json = await res.json();
      setSyncResult(json);
    } catch (e: unknown) {
      setSyncResult({ success: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ReactQueryProvider>
      <div className="h-screen">
        <Suspense>
          <Group orientation="horizontal">
            <Panel defaultSize={400} minSize={20} className="bg-gray-100 p-4 flex flex-col">
              <h2 className="text-lg font-bold mb-4">Folders</h2>
              <div className="flex-1 min-h-0 overflow-auto">
                <NoteTreeWrapper />
              </div>
              <Stack spacing={1} sx={{ pt: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={syncing ? <CircularProgress size={14} /> : <SyncIcon />}
                  onClick={handleSync}
                  disabled={syncing}
                  fullWidth
                >
                  {syncing ? 'Syncing...' : 'Sync'}
                </Button>
                {syncResult && (
                  <Alert severity={syncResult.success ? 'success' : 'error'} sx={{ py: 0 }}>
                    {syncResult.success ? '同期完了' : syncResult.error}
                  </Alert>
                )}
              </Stack>
            </Panel>
            <Separator className="w-2 bg-gray-300 hover:bg-gray-400 cursor-col-resize" />
            <Panel className="bg-white overflow-hidden relative">
              <Paper
                elevation={2}
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 50,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  bgcolor: 'background.paper',
                }}
              >
                <PreviewIcon
                  sx={{ fontSize: 18, color: mode === 'viewer' ? 'primary.main' : 'text.disabled' }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: mode === 'viewer' ? 'primary.main' : 'text.disabled',
                    fontWeight: mode === 'viewer' ? 700 : 400,
                  }}
                >
                  Viewer
                </Typography>
                <Switch
                  size="small"
                  checked={mode === 'editor'}
                  onChange={() => setMode(mode === 'viewer' ? 'editor' : 'viewer')}
                  color="primary"
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: mode === 'editor' ? 'primary.main' : 'text.disabled',
                    fontWeight: mode === 'editor' ? 700 : 400,
                  }}
                >
                  Editor
                </Typography>
                <EditNoteIcon
                  sx={{ fontSize: 18, color: mode === 'editor' ? 'primary.main' : 'text.disabled' }}
                />
              </Paper>
              {mode === 'viewer' ? (
                <div className="w-full h-full overflow-auto p-4">
                  <NoteViewer />
                </div>
              ) : (
                <div className="w-full h-full">
                  <NoteEditor />
                </div>
              )}
            </Panel>
          </Group>
        </Suspense>
      </div>
    </ReactQueryProvider>
  );
}
