import { useRef, useState, useCallback } from 'react';
import * as React from 'react';
import usePdfDocument from './hooks/usePdfDocument';
import VerticalPages from './VerticalPages';
import MessageService from './messageService';
import { DownloadButton, PrintButton, OpenLinkButton, CloseButton } from './ui/IconButtons';
import ZoomControls from './ui/ZoomControls';
import styled from 'styled-components';
import GotoInput from './ui/GotoPage';
import useAnnotator from './hooks/useAnnotator';
import useMarkupState from './hooks/useMarkupState';
import MarkupControls from './ui/MarkupControls';

require('./fullScreen.css');

const TitleWrapper = styled.div`
	font-size: 0.7rem;
	font-weight: 400;
	display: flex;
	align-items: start;
	flex-direction: column;
	min-width: 10rem;
	max-width: 18rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--secondary);
	padding: 0.2rem 0.6rem;
	height: 100%;
	width: 100%;
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
	isDarkTheme: boolean;
	messageService: MessageService;
	startPage: number;
	title: string;
}

export default function FullViewer(props: FullViewerProps) {
	const pdfDocument = usePdfDocument(props.pdfPath);
	const [zoom, setZoom] = useState<number>(1);
	const [startPage, setStartPage] = useState<number>(props.startPage || 1);
	const [selectedPage, setSelectedPage] = useState<number>(startPage);
	const [isEdited, setIsEdited] = useState<boolean>(false);
	const mainViewerRef = useRef<HTMLDivElement>(null);
	const thubmnailRef = useRef<HTMLDivElement>(null);
	const [markupState, dispatchMarkupState] = useMarkupState();

	const onActivePageChange = useCallback((pageNo: number) => {
		setSelectedPage(pageNo);
	}, []);

	const onAnnotationChange = useCallback(() => {
		setIsEdited(true);
	}, []);

	const annotator = useAnnotator(pdfDocument, onAnnotationChange);

	const goToPage = useCallback((pageNo: number) => {
		if (pageNo < 1 || pageNo > pdfDocument.pageCount || pageNo === selectedPage) return;
		setSelectedPage(pageNo);
		setStartPage(pageNo);
	}, [pdfDocument, selectedPage]);

	const onClose = useCallback(async () => {
		if (annotator.hasChanges) {
			// console.log('has changes');
			const data = await pdfDocument.getData();
			props.messageService.saveFile(data, true);
		} else {
			props.messageService.close();
		}
	}, [annotator, pdfDocument, props.messageService]);

	if (!pdfDocument) {
		return (
			<div className="full-app loading">
				<div></div>
			</div>);
	}

	return (
		<div className="full-app">
			<div className="top-bar">
				<div>
					<TitleWrapper>
						<Title title={props.title}>{props.title}</Title>
						<div>
							<span>{selectedPage} of {pdfDocument.pageCount} pages</span>
							<span title='Changes will be saved when viewer closed.' style={{ color: 'var(--blue)' }}>{isEdited ? '  (Edited)' : ''}</span>
						</div>
					</TitleWrapper>
				</div>
				<div>
					<ZoomControls onChange={setZoom} zoom={zoom} size={1} />
					<OpenLinkButton onClick={props.messageService.openExternalViewer} size={1.3} />
					<PrintButton onClick={pdfDocument?.printPdf} size={1.3}/>
					<DownloadButton onClick={pdfDocument?.downloadPdf} size={1.3}/>
					<GotoInput onChange={goToPage} size={1.3} pageCount={pdfDocument.pageCount} currentPage={selectedPage} />
					<MarkupControls markupState={markupState} dispatch={dispatchMarkupState} />
				</div>
				<div>
					<CloseButton onClick={onClose} size={1.3} />
				</div>
			</div>
			<div className="viewers dark-bg">
				<div className="pane thumbnail-pane" ref={thubmnailRef}>
					<VerticalPages
						pdfDocument={pdfDocument}
						isDarkTheme={true}
						rememberScroll={false}
						container={thubmnailRef}
						pageGap={16}
						widthPercent={86}
						showPageNumbers={true}
						selectedPage={selectedPage}
						onPageClick={goToPage}
						textSelectable={false}
						zoom={1}
					/>
				</div>
				<div className="pane main-pane" ref={mainViewerRef}>
					<VerticalPages
						pdfDocument={pdfDocument}
						isDarkTheme={true}
						rememberScroll={false}
						container={mainViewerRef}
						zoom={zoom}
						pageGap={5}
						anchorPage={startPage}
						onActivePageChange={onActivePageChange}
						textSelectable={true}
						onTextSelect={props.messageService.textSelected}
						annotator={annotator}
						markupState={markupState}
						showPageNumbers={false}
					/>
				</div>
			</div>
		</div>
	);
}
