import { useDispatch, useSelector, useStore } from 'react-redux';
import type { AppDispatch, AppStore, RootState } from './store';
import { useQuery } from '@tanstack/react-query';
import { NoteEntity } from './database';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();

export type TreeNode = FolderNode | NoteNode;

export interface FolderNode {
  id: string;
  title: string;
  parent_id: string;
  updated_time: number;
  created_time: number;
  type: 'Folder';
  children: TreeNode[];
}

export interface NoteNode {
  id: string;
  title: string;
  parent_id: string;
  updated_time: number;
  created_time: number;
  type: 'Note';
  metadata: NoteEntity;
}

interface ApiResponse<T = TreeNode[]> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function useGetNote(noteId: string | null) {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['note', noteId],
    queryFn: async () => {
      const res = await fetch(`/api/note?id=${encodeURIComponent(noteId as string)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch note');
      return json.data as NoteEntity & { body?: string };
    },
    enabled: !!noteId,
    staleTime: 0,
  });
  return { data, isLoading, error };
}

export function useFolderQuery() {
  async function fetchFolders(): Promise<TreeNode[]> {
    const res = await fetch('/api/tree');
    const json: ApiResponse<TreeNode[]> = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Failed to fetch folders');
    }
    return json.data || [];
  }

  const {
    data: folders,
    isLoading,
    error,
  } = useQuery<TreeNode[]>({ queryKey: ['folders'], queryFn: fetchFolders });
  return { folders, isLoading, error };
}
