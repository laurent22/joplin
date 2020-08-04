import styled, { css } from 'styled-components';

interface RootProps {
	readonly theme: any;
	readonly disabled: boolean;
}

export const StyledRoot = styled.a<RootProps>`
	opacity: ${props => props.disabled ? 0.3 : 1};
	height: ${props => props.theme.toolbarHeight}px;
	min-height: ${props => props.theme.toolbarHeight}px;
	width: ${props => props.theme.toolbarHeight}px;
	max-width: ${props => props.theme.toolbarHeight}px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: default;
	border-radius: 3px;

	&:hover {
		background-color: ${props => props.disabled ? 'none' : props.theme.backgroundColorHover3};
	}
`;

interface IconProps {
	readonly theme: any;
	readonly title: string;
}

const iconStyle = css<IconProps>`
	font-size: ${props => props.theme.toolbarIconSize}px;
	color: ${props => props.theme.color3};
	margin-right: ${props => props.title ? 5 : 0}px;
`;

export const StyledIconI = styled.i`${iconStyle}`;
export const StyledIconSpan = styled.span`${iconStyle}`;
