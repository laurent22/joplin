import Link from 'next/link'

export default function NotePage() {
  return (
    <div>
      <h1>hello world</h1>
      <Link href="/" className="text-blue-600 underline hover:text-blue-800">Go to Home</Link>
    </div>
  );
}
