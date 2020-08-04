import styled, { css } from 'styled-components';

interface RootProps {
	readonly theme: any;
	readonly disabled: boolean;
}

export const StyledRoot = styled.a<RootProps>`
	opacity: ${props => props.disabled ? 0.4 : 1};
	height: ${props => props.theme.toolbarHeight}px;
	min-height: ${props => props.theme.toolbarHeight}px;
	width: ${props => props.theme.toolbarHeight}px;
	max-width: ${props => props.theme.toolbarHeight}px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: default;
`;

interface IconProps {
	readonly theme: any;
	readonly title: string;
}

const iconStyle = css<IconProps>`
	font-size: ${props => props.theme.toolbarIconSize}px;
	color: ${props => props.theme.color3};
	margin-right: ${props => props.title ? 5 : 0}px;
	&:hover {
		color: ${props => props.theme.colorHover3};
	}
	&:active {
		color: ${props => props.theme.colorActive3};
	}
`;

export const StyledIconI = styled.i`${iconStyle}`;
export const StyledIconSpan = styled.span`${iconStyle}`;
