import React from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';

const ZoomGroup = styled.div<{ size: number }>`
display: flex;
justify-content: center;
align-items: center;
flex-flow: row;
color: var(--grey);
cursor: initial;
font-size: ${props => props.size}rem;
padding: 0.2rem 0.4rem;
user-select: none;
border-radius: 5px;
&:hover {
	background: #7676764d;
}
svg:hover {
	color: var(--secondary);
}
`;

export interface ZoomControlsProps {
	zoom: number;
	onChange: (zoom: number)=> void;
	size?: number;
}

export default function ZoomControls(props: ZoomControlsProps) {

	const zoomIn = () => {
		props.onChange(Math.min(props.zoom + 0.25, 2));
	};

	const zoomOut = () => {
		props.onChange(Math.max(props.zoom - 0.25, 0.5));
	};

	return (<ZoomGroup size={props.size || 0.8}>
		<FontAwesomeIcon icon={faMinus} title="Zoom Out" style={{ paddingRight: '0.2rem', cursor: 'pointer' }} onClick={zoomOut} />
		<span style={{ color: 'grey' }} >{props.zoom * 100}%</span>
		<FontAwesomeIcon icon={faPlus} title="Zoom In" style={{ paddingLeft: '0.2rem', cursor: 'pointer' }} onClick={zoomIn} />
	</ZoomGroup>);
}
