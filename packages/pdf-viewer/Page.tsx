import { useEffect, useRef, useState, MutableRefObject, useCallback } from 'react';
import * as React from 'react';
import useIsVisible from './hooks/useIsVisible';
import useVisibleOnSelect, { VisibleOnSelect } from './hooks/useVisibleOnSelect';
import PdfDocument from './PdfDocument';
import { ScaledSize, RenderRequest, MarkupState, MarkupTool, MarkupColor } from './types';
import styled from 'styled-components';
import Annotator from './Annotator';

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
	z-index: 2;
	&:hover{
        opacity: 0.3;
    }
`;

export interface PageProps {
	pdfDocument: PdfDocument;
	pageNo: number;
	focusOnLoad: boolean;
	isAnchored: boolean;
	scaledSize: ScaledSize;
	isDarkTheme: boolean;
	container: MutableRefObject<HTMLElement>;
	showPageNumbers: boolean;
	isSelected: boolean;
	textSelectable: boolean;
	onTextSelect?: (text: string)=> void;
	onClick?: (page: number)=> void;
	onDoubleClick?: (page: number)=> void;
	annotator?: Annotator;
	markupState?: MarkupState;
}


export default function Page(props: PageProps) {
	const [error, setError] = useState(null);
	const scaleRef = useRef<number>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const textRef = useRef<HTMLDivElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const isVisible = useIsVisible(wrapperRef, props.container);
	const isMarkupEnabled = useRef(props.markupState && props.markupState.isEnabled);
	useVisibleOnSelect({
		isVisible,
		isSelected: props.isSelected,
		container: props.container,
		wrapperRef,
	} as VisibleOnSelect);

	const renderPage = useCallback(async () => {
		const isCancelled = () => props.scaledSize.scale !== scaleRef.current;
		try {
			if (canvasRef.current) {
				canvasRef.current.style.height = '100%';
				canvasRef.current.style.width = '100%';
			}
			const renderRequest: RenderRequest = {
				pageNo: props.pageNo,
				scaledSize: props.scaledSize,
				getTextLayer: props.textSelectable,
				isCancelled,
			};
			const { canvas, textLayerDiv } = await props.pdfDocument.renderPage(renderRequest);

			wrapperRef.current.appendChild(canvas);
			if (textLayerDiv) wrapperRef.current.appendChild(textLayerDiv);

			if (canvasRef.current) canvasRef.current.remove();
			if (textRef.current) textRef.current.remove();

			canvasRef.current = canvas;
			if (textLayerDiv) textRef.current = textLayerDiv;
		} catch (error) {
			if (isCancelled()) return;
			error.message = `Error rendering page no. ${props.pageNo}: ${error.message}`;
			setError(error);
			throw error;
		}
	}, [props.pageNo, props.pdfDocument, props.scaledSize, props.textSelectable]);

	useEffect(() => {
		if (isVisible && props.scaledSize && (props.scaledSize.scale !== scaleRef.current)) {
			scaleRef.current = props.scaledSize.scale;
			void renderPage();
		}
	}, [props.scaledSize, isVisible, renderPage]);

	useEffect(() => {
		if (props.focusOnLoad) {
			props.container.current.scrollTop = wrapperRef.current.offsetTop;
			// console.warn('setting focus on page', props.pageNo, wrapperRef.current.offsetTop);
		}
	}, [props.container, props.focusOnLoad]);

	const applyMarkup = useCallback(async (e?: React.MouseEvent<HTMLDivElement>) => {
		try {
			if (props.markupState.currentTool !== MarkupTool.Erase) {
				await props.annotator.addTextAnnotation(props.markupState.currentTool as MarkupTool,
					props.markupState.color as MarkupColor,
					props.pageNo,
					props.scaledSize,
					canvasRef.current);
				void renderPage();
			} else {
				const updated = await props.annotator.deleteAnnotationAtClick(props.pageNo, props.scaledSize, canvasRef.current, e);
				if (updated) void renderPage();
			}
		} catch (error) {
			alert('Sorry we could not complete that operation. Your pdf might not be supported.');
			console.error(error);
		}
	}, [props.annotator, props.markupState, props.pageNo, props.scaledSize, renderPage]);

	useEffect(() => {
		if (!props.annotator || !props.markupState) return;
		if (props.markupState.isEnabled) {
			if (!isMarkupEnabled.current) {
				isMarkupEnabled.current = true;
				if (props.markupState.currentTool !== MarkupTool.Erase) {
					void applyMarkup();
				}
			}
		} else {
			isMarkupEnabled.current = false;
		}
	}, [applyMarkup, props.annotator, props.markupState, renderPage]);


	const onClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
		if (props.annotator && props.markupState && canvasRef.current) {
			if (props.markupState.isEnabled) {
				await applyMarkup(e);
			}
		}
		if (props.onClick) props.onClick(props.pageNo);
	}, [applyMarkup, props.annotator, props.markupState, props.onClick, props.pageNo]);

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
		<PageWrapper onDoubleClick={onDoubleClick} isSelected={!!props.isSelected} onContextMenu={onContextMenu} onClick={onClick} ref={wrapperRef} style={style}>
			{ error && <div>Error: {error}</div> }
			{props.showPageNumbers && <PageInfo isSelected={!!props.isSelected}>{props.isAnchored ? '📌' : ''} Page {props.pageNo}</PageInfo>}
		</PageWrapper>
	);
}
