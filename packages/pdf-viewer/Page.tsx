import { useEffect, useRef, useState, MutableRefObject, useCallback } from 'react';
import * as React from 'react';
import useIsVisible from './hooks/useIsVisible';
import useVisibleOnSelect, { VisibleOnSelect } from './hooks/useVisibleOnSelect';
import { PdfData, ScaledSize } from './pdfSource';
import styled from 'styled-components';


require('./textLayer.css');

const PageWrapper = styled.div<{ isSelected?: boolean }>`
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	overflow: hidden;
	border: ${props => props.isSelected ? 'solid 5px #0079ff' : 'solid thin rgba(120, 120, 120, 0.498)'};
	background: rgb(233, 233, 233);
	position: relative;
	border-radius: ${props => props.isSelected ? '0.3rem' : '0px'};
`;

const PageInfo = styled.div<{ isSelected?: boolean }>`
	position: absolute;
	top: 0.5rem;
	left: 0.5rem;
	padding: 0.3rem;
	background: ${props => props.isSelected ? '#0079ff' : 'rgba(203, 203, 203, 0.509)'};
	border-radius: 0.3rem;
	font-size: 0.8rem;
	color: ${props => props.isSelected ? 'white' : 'rgba(91, 91, 91, 0.829)'};
	backdrop-filter: blur(0.5rem);
	cursor: default;
	user-select: none;
	&:hover{
        opacity: 0.3;
    }
`;

export interface PageProps {
	pdf: PdfData;
	pageNo: number;
	focusOnLoad: boolean;
	isAnchored: boolean;
	scaledSize: ScaledSize;
	isDarkTheme: boolean;
	container: MutableRefObject<HTMLElement>;
	showPageNumbers?: boolean;
	isSelected?: boolean;
	textSelectable?: boolean;
	onTextSelect?: (text: string)=> void;
	onClick?: (page: number)=> void;
	onDoubleClick?: (page: number)=> void;
}


export default function Page(props: PageProps) {
	const [error, setError] = useState(null);
	const scaleRef = useRef<number>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const textRef = useRef<HTMLDivElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const isVisible = useIsVisible(canvasRef, props.container);
	useVisibleOnSelect({
		isVisible,
		isSelected: props.isSelected,
		container: props.container,
		wrapperRef,
	} as VisibleOnSelect);

	useEffect(() => {
		const isCancelled = () => props.scaledSize.scale !== scaleRef.current;

		const renderPage = async () => {
			try {
				await props.pdf.renderPage(props.pageNo, props.scaledSize, canvasRef, props.textSelectable ? textRef : null, isCancelled);
			} catch (error) {
				error.message = `Error rendering page no. ${props.pageNo}: ${error.message}`;
				setError(error);
				throw error;
			}
		};

		if (isVisible && props.scaledSize && (props.scaledSize.scale !== scaleRef.current)) {
			scaleRef.current = props.scaledSize.scale;
			void renderPage();
		}

	}, [props.scaledSize, isVisible, props.textSelectable, props.pageNo, props.pdf]);

	useEffect(() => {
		if (props.focusOnLoad) {
			props.container.current.scrollTop = wrapperRef.current.offsetTop;
			// console.warn('setting focus on page', props.pageNo, wrapperRef.current.offsetTop);
		}
	}, [props.container, props.focusOnLoad]);


	const onClick = useCallback(async (_e: React.MouseEvent<HTMLDivElement>) => {
		if (props.onClick) props.onClick(props.pageNo);
	}, [props.onClick, props.pageNo]);

	let style: any = {};
	if (props.scaledSize) {
		style = {
			...style,
			width: props.scaledSize.width,
			height: props.scaledSize.height,
		};
	}

	const onContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		if (!props.textSelectable || !props.onTextSelect || !window.getSelection()) return;
		const text = window.getSelection().toString();
		if (!text) return;
		props.onTextSelect(text);
		e.preventDefault();
		e.stopPropagation();
	}, [props.textSelectable, props.onTextSelect]);

	const onDoubleClick = useCallback(() => {
		if (props.onDoubleClick) props.onDoubleClick(props.pageNo);
	}, [props.onDoubleClick, props.pageNo]);

	return (
		<PageWrapper onDoubleClick={onDoubleClick} isSelected={!!props.isSelected} onClick={onClick} ref={wrapperRef} style={style}>
			<canvas ref={canvasRef} className="page-canvas" style={style}>
				<div>
					{error ? 'ERROR' : 'Loading..'}
				</div>
				Page {props.pageNo}
			</canvas>
			<div className="textLayer" onContextMenu={onContextMenu} ref={textRef}></div>
			{props.showPageNumbers && <PageInfo isSelected={!!props.isSelected}>{props.isAnchored ? '📌' : ''} Page {props.pageNo}</PageInfo>}
		</PageWrapper>
	);
}
