import React from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faDownload, IconDefinition } from '@fortawesome/free-solid-svg-icons';


const ButtonElement = styled.button<{ hoverColor?: string; size?: number; color?: string }>`
    padding: 0.2rem 0.7rem;
    cursor: pointer;
    border: solid thin transparent;
    border-radius: 5px;
    user-select: none;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: ${props=> props.size || 1}rem;
    background: transparent;
	color: var(--${props=>props.color || 'grey'});
    &:hover {
        background: #7676764d;
        ${props=>props.hoverColor && `color: var(--${props.hoverColor})`}
    }
`;

interface ButtonProps {
    icon?: IconDefinition;
    onClick?: ()=> void;
    name?: string;
    size?: number;
    color?: string;
    hoverColor?: string;
}

export function Button({ onClick, icon, name, size, color, hoverColor }: ButtonProps) {
	return (
		<ButtonElement onClick={onClick} title={name}
			color={color}
			size={size}
			hoverColor={hoverColor || 'secondary'}>
			<FontAwesomeIcon icon={icon} />
		</ButtonElement>
	);
}

export function DownloadButton({ onClick, size, color }: ButtonProps) {
	return (
		<Button onClick={onClick} icon={faDownload} name='Download' size={size} color={color} />
	);
}

export function PrintButton({ onClick, size, color }: ButtonProps) {
	return (
		<Button onClick={onClick} icon={faPrint} name='Print' size={size} color={color} />
	);
}
