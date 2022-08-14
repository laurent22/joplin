import React, { useRef, useState } from 'react';
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
	const [activePage, setActivePage] = useState(1);
	const isFocused = useIsFocused();
	const containerEl = useRef<HTMLDivElement>(null);

	if (!pdf) {
		return (
			<div className="mini-app loading">
				<div>Loading pdf..</div>
			</div>);
	}

	const onActivePageChange = (page: number) => {
		setActivePage(page);
	};

	return (
		<div className={`mini-app${isFocused ? ' focused' : ''}`}>
			<div className={`app-pages${isFocused ? ' focused' : ''}`} ref={containerEl}>
				<VerticalPages pdf={pdf} isDarkTheme={props.isDarkTheme} anchorPage={props.anchorPage}
					onActivePageChange={onActivePageChange} container={containerEl} />
			</div>
			<div className='app-bottom-bar'>
				<div className='pdf-info'>
					<div style={{ paddingRight: '0.4rem' }}>{activePage}/{pdf.pageCount} pages</div>
					<a onClick={pdf?.printPdf}>
						Print
					</a>
					<a onClick={pdf?.downloadPdf}>
						Download
					</a>
				</div>
				<div>{isFocused ? '' : 'Click to enable scroll'}</div>
			</div>
		</div>
	);
}
