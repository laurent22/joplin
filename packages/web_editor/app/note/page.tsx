'use client';

import { Suspense } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import NoteTreeWrapper from '../components/NoteTreeWrapper';
import ReactQueryProvider from '../components/ReactQueryProvider';
import NoteViewer from '../components/NoteViewer';

export default function NotePage() {
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
            <Panel className="bg-white p-4 overflow-auto">
              <NoteViewer />
            </Panel>
          </Group>
        </Suspense>
      </div>
    </ReactQueryProvider>
  );
}
