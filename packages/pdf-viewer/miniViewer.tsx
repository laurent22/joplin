import React, { useRef, useState } from 'react';
import useIsFocused from './hooks/useIsFocused';
import usePdfData from './hooks/usePdfData';
import VerticalPages from './VerticalPages';
import styled from 'styled-components';

const ZoomButton = styled.a`
	font-size: 1rem;
	cursor: pointer;
	color:  var(--blue);
	font-weight: 200;
	padding: 0px 0.2rem;
`;

const ZoomGroup = styled.a`
	display: flex;
	justify-content: center;
	align-items: center;
	flex-flow: row;
	color: var(--grey);
	height: 1.4rem;
	cursor: initial !important;
`;

export interface MiniViewerAppProps {
	pdfPath: string;
	isDarkTheme: boolean;
	anchorPage: number;
	pdfId: string;
}

export default function MiniViewerApp(props: MiniViewerAppProps) {
	const pdf = usePdfData(props.pdfPath);
	const isFocused = useIsFocused();
	const [zoom, setZoom] = useState<number>(1);
	const containerEl = useRef<HTMLDivElement>(null);

	if (!pdf) {
		return (
			<div className="mini-app loading">
				<div>Loading pdf..</div>
			</div>);
	}

	const zoomIn = () => {
		setZoom(Math.min(zoom + 0.25, 2));
	};

	const zoomOut = () => {
		setZoom(Math.max(zoom - 0.25, 0.5));
	};

	return (
		<div className={`mini-app${isFocused ? ' focused' : ''}`}>
			<div className={`app-pages${isFocused ? ' focused' : ''}`} ref={containerEl}>
				<VerticalPages pdf={pdf} isDarkTheme={props.isDarkTheme} anchorPage={props.anchorPage} pdfId={props.pdfId} rememberScroll={true}
					container={containerEl} showPageNumbers={true} zoom={zoom} />
			</div>
			<div className='app-bottom-bar'>
				<div className='pdf-info'>
					<div style={{ paddingRight: '0.4rem' }}>{pdf.pageCount} pages</div>
					<ZoomGroup>
						<ZoomButton onClick={zoomIn}>+</ZoomButton>
						<span style={{ color: 'grey' }} >{zoom * 100}%</span>
						<ZoomButton onClick={zoomOut} style={{ fontSize: '1.6rem' }}>-</ZoomButton>
					</ZoomGroup>
				</div>
				<div>{isFocused ? '' : 'Click to enable scroll'}</div>
			</div>
		</div>
	);
}
