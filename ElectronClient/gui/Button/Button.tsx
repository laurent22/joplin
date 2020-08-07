import * as React from 'react';
const styled = require('styled-components').default;

export enum ButtonLevel {
	Primary = 'primary',
	Secondary = 'secondary',
	Tertiary = 'tertiary',
}

interface Props {
	title?: string,
	iconName?: string,
	level: ButtonLevel,
}

function levelToBgColor(props:any) {
	if (props.level === ButtonLevel.Primary) return props.theme.color4;
	if (props.level === ButtonLevel.Secondary) return props.theme.backgroundColor4;
	throw new Error(`Invalid level: ${props.level}`);
}

function levelToColor(props:any) {
	if (props.level === ButtonLevel.Primary) return props.theme.backgroundColor4;
	if (props.level === ButtonLevel.Secondary) return props.theme.color4;
	throw new Error(`Invalid level: ${props.level}`);
}

function levelToBorder(props:any) {
	if (props.level === ButtonLevel.Primary) return 'none';
	if (props.level === ButtonLevel.Secondary) return `1px solid ${props.theme.color4}`;
	throw new Error(`Invalid level: ${props.level}`);
}

const StyledButton = styled.button`
	display: flex;
	height: ${(props:any) => `${props.theme.toolbarHeight}px`};
	min-height: ${(props:any) => `${props.theme.toolbarHeight}px`};
	max-height: ${(props:any) => `${props.theme.toolbarHeight}px`};
	width: ${(props:any) => props.iconOnly ? `${props.theme.toolbarHeight}px` : 'auto'};
	${(props:any) => props.iconOnly ? `min-width: ${props.theme.toolbarHeight}px;` : ''}
	${(props:any) => props.iconOnly ? `max-width: ${props.theme.toolbarHeight}px;` : ''}
	box-sizing: border-box;
	border: ${(props:any) => levelToBorder(props)};
	border-radius: 3px;
	background-color: ${(props:any) => levelToBgColor(props)};
	font-size: ${(props:any) => props.theme.fontSize}px;
	padding: 0 ${(props:any) => props.iconOnly ? 4 : 8}px;
	justify-content: center;

	&::hover {
		color: ${(props:any) => props.theme.colorFaded};
	}
`;

const StyledIcon = styled.span`
	font-size: ${(props:any) => props.theme.toolbarIconSize}px;
	color: ${(props:any) => levelToColor(props)};
`;

export default function Button(props:Props) {
	const iconOnly = props.iconName && !props.title;
	return (
		<StyledButton iconOnly={iconOnly} level={props.level}>
			{props.title}
			<StyledIcon className={props.iconName} level={props.level}/>
		</StyledButton>
	);
}
