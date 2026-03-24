'use client';

import { useState } from 'react';
import { Stack, Button, CircularProgress, Alert } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { useQueryClient } from '@tanstack/react-query';

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; error?: string } | null>(null);
  const queryClient = useQueryClient();

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const json = await res.json();
      setSyncResult(json);
      if (json.success) {
        await queryClient.invalidateQueries({ queryKey: ['folders'] });
      }
    } catch (e: unknown) {
      setSyncResult({ success: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setSyncing(false);
    }
  };

  return (
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
  );
}
