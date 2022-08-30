import { useRef, useState, useCallback } from 'react';
import * as React from 'react';
import usePdfData from './hooks/usePdfData';
import VerticalPages from './VerticalPages';
import MessageService from './messageService';
import { OpenLinkButton, CloseButton } from './ui/IconButtons';
import ZoomControls from './ui/ZoomControls';

export interface FullViewerProps {
	pdfPath: string;
	isDarkTheme?: boolean;
	anchorPage?: number;
	pdfId?: string;
	messageService?: MessageService;
	startPage?: number;
}

export default function FullViewer(props: FullViewerProps) {
	const pdf = usePdfData(props.pdfPath);
	const [zoom, setZoom] = useState<number>(1);
	const [startPage, setStartPage] = useState<number>(props.startPage || 1);
	const [selectedPage, setSelectedPage] = useState<number>(startPage);
	const mainViewerRef = useRef<HTMLDivElement>(null);
	const thubmnailRef = useRef<HTMLDivElement>(null);

	const onActivePageChange = useCallback((pageNo: number) => {
		setSelectedPage(pageNo);
	}, []);

	const goToPage = useCallback((pageNo: number) => {
		setSelectedPage(pageNo);
		setStartPage(pageNo);
	}, []);

	const onPageNoInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.value.length <= 0) return;
		const pageNo = parseInt(e.target.value, 10);
		if (pageNo < 1 || pageNo > pdf.pageCount) return;
		goToPage(pageNo);
	}, [goToPage, pdf]);

	if (!pdf) {
		return (
			<div className="full-app loading">
				<div>Loading pdf..</div>
			</div>);
	}

	return (
		<div className="full-app">
			<div className="top-bar">
				<ZoomControls onChange={setZoom} zoom={zoom} size={0.9} />
				<OpenLinkButton onClick={props.messageService.openExternalViewer} size={1.1} />
				<div className="bar-btn">
					<input onChange={onPageNoInput} placeholder="Go to page"/> {selectedPage} / {pdf.pageCount} Pages
				</div>
				<CloseButton onClick={props.messageService.close} size={1.2} />
			</div>
			<div className="viewers">
				<div className="thumbnail-wrapper">
					<div className="pane thumbnail-pane" ref={thubmnailRef}>
						<VerticalPages
							pdf={pdf}
							isDarkTheme={true}
							rememberScroll={false}
							container={thubmnailRef}
							pageGap={16}
							showPageNumbers={true}
							selectedPage={selectedPage}
							onPageClick={goToPage}
						/>
					</div>
				</div>
				<div className="pane main-pane" ref={mainViewerRef}>
					<VerticalPages
						pdf={pdf}
						isDarkTheme={true}
						rememberScroll={false}
						container={mainViewerRef}
						zoom={zoom}
						pageGap={5}
						anchorPage={startPage}
						onActivePageChange={onActivePageChange}
						textSelectable={true}
						onTextSelect={props.messageService.textSelected}
					/>
				</div>
			</div>
		</div>
	);
}
