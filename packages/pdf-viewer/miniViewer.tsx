import React, { useRef } from 'react';
import useIsFocused from './hooks/useIsFocused';
import usePdfData from './hooks/usePdfData';
import VerticalPages from './VerticalPages';

export interface MiniViewerAppProps {
	pdfPath: string;
	isDarkTheme: boolean;
	anchorPage: number;
	pdfId: string;
}

export default function MiniViewerApp(props: MiniViewerAppProps) {
	const pdf = usePdfData(props.pdfPath);
	const isFocused = useIsFocused();
	const containerEl = useRef<HTMLDivElement>(null);

	if (!pdf) {
		return (
			<div className="mini-app loading">
				<div>Loading pdf..</div>
			</div>);
	}

	return (
		<div className={`mini-app${isFocused ? ' focused' : ''}`}>
			<div className={`app-pages${isFocused ? ' focused' : ''}`} ref={containerEl}>
				<VerticalPages pdf={pdf} isDarkTheme={props.isDarkTheme} anchorPage={props.anchorPage} pdfId={props.pdfId} rememberScroll={true}
					container={containerEl} showPageNumbers={true} />
			</div>
			<div className='app-bottom-bar'>
				<div className='pdf-info'>
					{pdf.pageCount} pages
				</div>
				<div>{isFocused ? '' : 'Click to enable scroll'}</div>
			</div>
		</div>
	);
}
