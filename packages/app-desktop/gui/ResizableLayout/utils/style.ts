import styled from 'styled-components';

export const StyledWrapperRoot = styled.div`
	border: 1px solid green;
	position: relative;
	display: flex;
	width: ${props => props.size.width}px;
	height: ${props => props.size.height}px;
`;

export const StyledMoveOverlay = styled.div`
	z-index: 100;
	background-color: rgba(0,0,0,0.5);
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
`;
