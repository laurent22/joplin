import Link from 'next/link'
import { Panel, Group, Separator } from "react-resizable-panels";

export default function NotePage() {
  return (
    <div className="h-screen">
      <Group orientation="horizontal">
        <Panel defaultSize={400} minSize={20} className="bg-gray-100 p-4">
          <h1>hello world</h1>
          <Link href="/" className="text-blue-600 underline hover:text-blue-800">Go to Home</Link>
        </Panel>
        <Separator className="w-2 bg-gray-300 hover:bg-gray-400 cursor-col-resize" />
        <Panel className="bg-white p-4">
          <h2>右ペイン</h2>
          <p>コンテンツがここに表示されます</p>
        </Panel>
      </Group>
    </div>
  );
}
