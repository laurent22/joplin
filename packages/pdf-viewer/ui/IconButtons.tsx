import React from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquareArrowUpRight, faXmark, IconDefinition } from '@fortawesome/free-solid-svg-icons';


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

export function OpenLinkButton({ onClick, size, color }: ButtonProps) {
	return (
		<Button onClick={onClick} icon={faSquareArrowUpRight} name='Open in another app' size={size} color={color} />
	);
}

export function CloseButton({ onClick, size, color }: ButtonProps) {
	return (
		<Button onClick={onClick} icon={faXmark} name='Close' size={size} color={color} hoverColor={'red'} />
	);
}
