import { ThemeAppearance } from '@joplin/lib/themes/type';
import styled from 'styled-components';

// Need to use `attrs` otherwise styled-components creates many instances of the
// style when the component is resized.
// https://github.com/styled-components/styled-components/issues/1212
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const StyledWrapperRoot: any = styled.div.attrs((props: any) => ({
	style: {
		width: props.size.width,
		height: props.size.height,
	},
}))`
	position: relative;
	display: flex;
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

export const MoveModeRootMessage = styled.h1`
	position: absolute;
	bottom: 10px;
	font-size: 1em;

	z-index:200;
	background-color: ${props => props.theme.backgroundColor};
	padding: 10px;
`;
