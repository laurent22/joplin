import { useRef, useState, useCallback } from 'react';
import * as React from 'react';
import usePdfData from './hooks/usePdfData';
import VerticalPages from './VerticalPages';
import MessageService from './messageService';
import { OpenLinkButton, CloseButton } from './ui/IconButtons';
import ZoomControls from './ui/ZoomControls';
import styled from 'styled-components';
import GotoInput from './ui/GotoPage';


const TitleWrapper = styled.div`
	font-size: 0.7rem;
	font-weight: 400;
	display: flex;
	align-items: start;
	flex-direction: column;
	min-width: 15rem;
	max-width: 18rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--secondary);
	padding: 0.2rem 0.4rem;
	height: 100%;
	justify-content: center;
`;

const Title = styled.div`
	font-size: 0.9rem;
	font-weight: bold;
	margin-bottom: 0.2rem;
	color: var(--primary);
	overflow: hidden;
`;


export interface FullViewerProps {
	pdfPath: string;
	isDarkTheme?: boolean;
	anchorPage?: number;
	pdfId?: string;
	messageService?: MessageService;
	startPage?: number;
	title?: string;
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
		if (pageNo < 1 || pageNo > pdf.pageCount || pageNo === selectedPage) return;
		setSelectedPage(pageNo);
		setStartPage(pageNo);
	}, [pdf, selectedPage]);

	if (!pdf) {
		return (
			<div className="full-app loading">
				<div>Loading pdf..</div>
			</div>);
	}

	return (
		<div className="full-app">
			<div className="top-bar">
				<TitleWrapper>
					<Title title={props.title}>{props.title || props.pdfId}</Title>
					<div>{selectedPage} of {pdf.pageCount} pages</div>
				</TitleWrapper>
				<ZoomControls onChange={setZoom} zoom={zoom} size={1} />
				<OpenLinkButton onClick={props.messageService.openExternalViewer} size={1.3} />
				<GotoInput onChange={goToPage} size={1.3} pageCount={pdf.pageCount} currentPage={selectedPage} />
				<CloseButton onClick={props.messageService.close} size={1.3} />
			</div>
			<div className="viewers dark-bg">
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
