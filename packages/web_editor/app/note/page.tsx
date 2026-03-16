'use client';

import { Suspense, useState } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import NoteTreeWrapper from '../components/NoteTreeWrapper';
import ReactQueryProvider from '../components/ReactQueryProvider';
import NoteViewer from '../components/NoteViewer';
import NoteEditor from '../components/NoteEditor';

export default function NotePage() {
  const [mode, setMode] = useState<'viewer' | 'editor'>('viewer');

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
            </Panel>
            <Separator className="w-2 bg-gray-300 hover:bg-gray-400 cursor-col-resize" />
            <Panel className="bg-white overflow-hidden relative">
              <button
                onClick={() => setMode(mode === 'viewer' ? 'editor' : 'viewer')}
                className="absolute top-4 right-4 z-10 px-3 py-1 rounded border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-100 shadow"
              >
                {mode === 'viewer' ? 'Editor' : 'Viewer'}
              </button>
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
