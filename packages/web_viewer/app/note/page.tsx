import Link from 'next/link'
import { Panel, Group, Separator } from "react-resizable-panels";
import NoteTree from '../components/NoteTree';
import ReactQueryProvider from '../components/ReactQueryProvider';

export default function NotePage() {
  return (
    <ReactQueryProvider>
      <div className="h-screen">
        <Group orientation="horizontal">
          <Panel defaultSize={400} minSize={20} className="bg-gray-100 p-4 flex flex-col">
            <h2 className="text-lg font-bold mb-4">Folders</h2>
            <div className="flex-1 min-h-0 overflow-auto">
              <NoteTree />
            </div>
            <div className="mt-4">
              <Link href="/" className="text-blue-600 underline hover:text-blue-800">Go to Home</Link>
            </div>
          </Panel>
          <Separator className="w-2 bg-gray-300 hover:bg-gray-400 cursor-col-resize" />
          <Panel className="bg-white p-4">
            <h2>右ペイン</h2>
            <p>コンテンツがここに表示されます</p>
          </Panel>
        </Group>
      </div>
    </ReactQueryProvider>
  );
}
