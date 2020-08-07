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
	className?:string,
	onClick():void,
}

const StyledButtonBase = styled.button`
	display: flex;
	height: ${(props:any) => `${props.theme.toolbarHeight}px`};
	min-height: ${(props:any) => `${props.theme.toolbarHeight}px`};
	max-height: ${(props:any) => `${props.theme.toolbarHeight}px`};
	width: ${(props:any) => props.iconOnly ? `${props.theme.toolbarHeight}px` : 'auto'};
	${(props:any) => props.iconOnly ? `min-width: ${props.theme.toolbarHeight}px;` : ''}
	${(props:any) => props.iconOnly ? `max-width: ${props.theme.toolbarHeight}px;` : ''}
	box-sizing: border-box;
	border-radius: 3px;
	font-size: ${(props:any) => props.theme.fontSize}px;
	padding: 0 ${(props:any) => props.iconOnly ? 4 : 8}px;
	justify-content: center;
`;

const StyledButtonPrimary = styled(StyledButtonBase)`
	border: none;
	background-color: ${(props:any) => props.theme.backgroundColor5};

	&:hover {
		background-color: ${(props:any) => props.theme.backgroundColorHover5};
	}

	&:active {
		background-color: ${(props:any) => props.theme.backgroundColorActive5};
	}
`;

const StyledButtonSecondary = styled(StyledButtonBase)`
	border: 1px solid ${(props:any) => props.theme.color4};
	background-color: ${(props:any) => props.theme.backgroundColor4};

	&:hover {
		background-color: ${(props:any) => props.theme.backgroundColorHover4};
	}

	&:active {
		background-color: ${(props:any) => props.theme.backgroundColorActive4};
	}
`;

const StyledIconBase = styled.span`
	font-size: ${(props:any) => props.theme.toolbarIconSize}px;
`;

const StyledIconPrimary = styled(StyledIconBase)`
	color: ${(props:any) => props.theme.color5};
`;

const StyledIconSecondary = styled(StyledIconBase)`
	color: ${(props:any) => props.theme.color4};
`;

export default function Button(props:Props) {
	const iconOnly = props.iconName && !props.title;

	const StyledButton = props.level === ButtonLevel.Primary ? StyledButtonPrimary : StyledButtonSecondary;
	const StyledIcon = props.level === ButtonLevel.Primary ? StyledIconPrimary : StyledIconSecondary;

	return (
		<StyledButton className={props.className} iconOnly={iconOnly} onClick={props.onClick}>
			{props.title}
			<StyledIcon className={props.iconName}/>
		</StyledButton>
	);
}
