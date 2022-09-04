import React, { useCallback, useState } from 'react';
import Popup from 'reactjs-popup';
import styled from 'styled-components';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faAngleRight, faAngleLeft } from '@fortawesome/free-solid-svg-icons';
import Annotator from '../Annotator';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';


const MenuOption = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	flex-flow: row;
	color: var(--grey);
	cursor: pointer;
	font-size: 0.9rem;
	font-weight: 500;
	padding: 0.2rem 0.4rem;
	&:hover {
		color: var(--secondary);
	}
`;

const popupStyle = {
	padding: '3px 4px',
	border: 'none',
	background: 'black',
	borderRadius: '0.6rem',
	display: 'flex',
	justifyContent: 'center',
	alignItems: 'center',
	flexFlow: 'row',
};

export interface AnnotationPopupProps {
	onPageUpdate: ()=> void;
	onClose: ()=> void;
	pageNo: number;
    annotator: Annotator;
    isOpen: boolean;
}

export default function AnnotationPopup(props: AnnotationPopupProps) {
	const [selectedId, setSelectedId] = useState(null);
	const [textSelected, setTextSelected] = useState(false);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		if (! props.annotator || !props.isOpen) return;
		const annotationId = await props.annotator.getAnnotationIdAtClick();
		if (event.cancelled) return;
		setSelectedId(annotationId);
		setTextSelected(props.annotator.hasTextSelection());
	}, [props.isOpen, props.annotator]);

	const highlightText = useCallback(async () => {
		if (!props.annotator || !textSelected) return;
		await props.annotator.addHighlightAtClick();
		props.onPageUpdate();
	}, [props.annotator, props.onPageUpdate, textSelected]);

	const deleteAnnotation = useCallback(async () => {
		if (!props.annotator || !selectedId) return;
		await props.annotator.deleteAnnotation(selectedId);
		props.onPageUpdate();
	}, [props.annotator, props.onPageUpdate, selectedId]);

	const dontPropagate = (cb: ()=> void) => {
		return (event: React.MouseEvent<HTMLDivElement>) => {
			event.stopPropagation();
			void cb();
		};
	};

	return (<Popup
		position="bottom center"
		open={props.isOpen}
		onClose={props.onClose}
		closeOnDocumentClick
		mouseLeaveDelay={100}
		mouseEnterDelay={0}
		contentStyle={popupStyle}
		arrow={false}
	>
		{textSelected && <MenuOption onClick={dontPropagate(highlightText)}>Highlight</MenuOption>}
		{selectedId && <MenuOption onClick={dontPropagate(deleteAnnotation)}>Erase</MenuOption>}
	</Popup>);
}
