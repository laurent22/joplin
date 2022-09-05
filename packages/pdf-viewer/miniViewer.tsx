import React, { useRef, useState, useCallback } from 'react';
import useIsFocused from './hooks/useIsFocused';
import usePdfDocument from './hooks/usePdfDocument';
import VerticalPages from './VerticalPages';
import ZoomControls from './ui/ZoomControls';
import { DownloadButton, PrintButton } from './ui/IconButtons';

require('./miniViewer.css');

export interface MiniViewerAppProps {
	pdfPath: string;
	isDarkTheme: boolean;
	anchorPage: number;
	pdfId: string;
}

export default function MiniViewerApp(props: MiniViewerAppProps) {
	const pdfDocument = usePdfDocument(props.pdfPath);
	const isFocused = useIsFocused();
	const [zoom, setZoom] = useState<number>(1);
	const containerEl = useRef<HTMLDivElement>(null);
	const [activePage, setActivePage] = useState(1);

	const onActivePageChange = useCallback((page: number) => {
		setActivePage(page);
	}, []);

	if (!pdfDocument) {
		return (
			<div className="mini-app loading">
				<div>Loading pdf..</div>
			</div>);
	}

	return (
		<div className={`mini-app${isFocused ? ' focused' : ''}`}>
			<div className={`app-pages${isFocused ? ' focused' : ''}`} ref={containerEl}>
				<VerticalPages
					pdfDocument={pdfDocument}
					isDarkTheme={props.isDarkTheme}
					anchorPage={props.anchorPage}
					pdfId={props.pdfId}
					rememberScroll={true}
					container={containerEl}
					showPageNumbers={true}
					zoom={zoom}
					pageGap={2}
					onActivePageChange={onActivePageChange} />
			</div>
			<div className='app-bottom-bar'>
				<div className='pdf-info'>
					<div style={{ paddingRight: '0.4rem' }}>{activePage}/{pdfDocument.pageCount} pages</div>
					<ZoomControls onChange={setZoom} zoom={zoom} />
					<PrintButton onClick={pdfDocument?.printPdf}/>
					<DownloadButton onClick={pdfDocument?.downloadPdf}/>
				</div>
				<div className="can-hide">{isFocused ? '' : 'Click to enable scroll'}</div>
			</div>
		</div>
	);
}
