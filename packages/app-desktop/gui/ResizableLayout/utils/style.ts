import { ThemeAppearance } from '@joplin/lib/themes/type';
import styled from 'styled-components';

export const StyledWrapperRoot = styled.div`
	position: relative;
	display: flex;
	width: ${props => props.size.width}px;
	height: ${props => props.size.height}px;
`;

export const StyledMoveOverlay = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 100;
	background-color: ${props => props.theme.appearance === ThemeAppearance.Light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'};
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
`;

export const MoveModeRootWrapper = styled.div`
	position:relative;
	display: flex;
	align-items: center;
	justify-content: center;
`;

export const MoveModeRootMessage = styled.div`
	position:absolute;
	bottom: 10px;
	z-index:200;
	background-color: ${props => props.theme.backgroundColor};
	padding: 10px;
	border-radius: 5;
`;
