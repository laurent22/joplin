'use client';

import { useState } from 'react';
import { Stack, Button, CircularProgress, Alert, Typography, Box } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { useQueryClient } from '@tanstack/react-query';

interface SyncStats {
  fetchingTotal?: number;
  fetchingProcessed?: number;
  createLocal?: number;
  updateLocal?: number;
  deleteLocal?: number;
  createRemote?: number;
  updateRemote?: number;
  deleteRemote?: number;
  totalFolders?: number;
  totalNotes?: number;
  totalResources?: number;
}

export default function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    error?: string;
    stats?: SyncStats;
  } | null>(null);
  const queryClient = useQueryClient();

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const json = await res.json();
      setSyncResult(json);
      if (json.success) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['folders'] }),
          queryClient.invalidateQueries({ queryKey: ['note'] }),
        ]);
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
          {syncResult.success ? (
            <Box>
              <Typography variant="body2" fontWeight="bold">
                同期完了
              </Typography>
              {syncResult.stats && (
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  {syncResult.stats.fetchingTotal !== undefined && (
                    <li>
                      <Typography variant="caption">
                        Fetching: {syncResult.stats.fetchingProcessed ?? 0} /{' '}
                        {syncResult.stats.fetchingTotal}
                      </Typography>
                    </li>
                  )}
                  {(syncResult.stats.createLocal ?? 0) > 0 && (
                    <li>
                      <Typography variant="caption">
                        取得 (新規): {syncResult.stats.createLocal}
                      </Typography>
                    </li>
                  )}
                  {(syncResult.stats.updateLocal ?? 0) > 0 && (
                    <li>
                      <Typography variant="caption">
                        取得 (更新): {syncResult.stats.updateLocal}
                      </Typography>
                    </li>
                  )}
                  {(syncResult.stats.deleteLocal ?? 0) > 0 && (
                    <li>
                      <Typography variant="caption">
                        削除 (ローカル): {syncResult.stats.deleteLocal}
                      </Typography>
                    </li>
                  )}
                  {(syncResult.stats.createRemote ?? 0) > 0 && (
                    <li>
                      <Typography variant="caption">
                        送信 (新規): {syncResult.stats.createRemote}
                      </Typography>
                    </li>
                  )}
                  {(syncResult.stats.updateRemote ?? 0) > 0 && (
                    <li>
                      <Typography variant="caption">
                        送信 (更新): {syncResult.stats.updateRemote}
                      </Typography>
                    </li>
                  )}
                  {(syncResult.stats.deleteRemote ?? 0) > 0 && (
                    <li>
                      <Typography variant="caption">
                        削除 (リモート): {syncResult.stats.deleteRemote}
                      </Typography>
                    </li>
                  )}
                  {syncResult.stats.totalFolders !== undefined && (
                    <li>
                      <Typography variant="caption">
                        フォルダ: {syncResult.stats.totalFolders} / ノート:{' '}
                        {syncResult.stats.totalNotes ?? 0} / リソース:{' '}
                        {syncResult.stats.totalResources ?? 0}
                      </Typography>
                    </li>
                  )}
                </Box>
              )}
            </Box>
          ) : (
            syncResult.error
          )}
        </Alert>
      )}
    </Stack>
  );
}
