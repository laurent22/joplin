
// Custom type definitions for pdfjs-dist. packages/lib should avoid depending on
// pdfjs-dist directly, since an unpatched version of pdfjs-dist depends on node-canvas,
// which makes it more difficult to build Joplin.

interface PdfTextContent {
	items: { str?: string }[];
}

interface Viewport {
	width: number;
	height: number;
}

interface RenderOptions {
	canvasContext: CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D;
	viewport: Viewport;
}

interface PdfPage {
	getViewport(options: { scale: number }): Viewport;
	render(options: RenderOptions): { promise: Promise<void> };
	getTextContent(): Promise<PdfTextContent>;
}

interface PdfDocument {
	numPages: number;
	getPage(n: number): Promise<PdfPage>;
	destroy(): Promise<void>;
}

interface GetDocumentTask {
	promise: Promise<PdfDocument>;
}

interface GetDocumentOptions {
	url: string;
	useSystemFonts: boolean;
	// IMPORTANT: Set to false to mitigate CVE-2024-4367.
	isEvalSupported: false;
}

interface PdfJs {
	getDocument(options: GetDocumentOptions): GetDocumentTask;
}

export default PdfJs;

