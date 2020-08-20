import * as React from 'react';
const styled = require('styled-components').default;
const { space } = require('styled-system');

export enum ButtonLevel {
	Primary = 'primary',
	Secondary = 'secondary',
	Tertiary = 'tertiary',
	SideBarSecondary = 'sideBarSecondary',
}

interface Props {
	title?: string,
	iconName?: string,
	level?: ButtonLevel,
	className?:string,
	onClick():void,
	color?: string,
	iconAnimation?: string,
}

const StyledTitle = styled.span`

`;

const StyledButtonBase = styled.button`
	display: flex;
	align-items: center;
	flex-direction: row;
	height: ${(props:any) => `${props.theme.toolbarHeight}px`};
	min-height: ${(props:any) => `${props.theme.toolbarHeight}px`};
	max-height: ${(props:any) => `${props.theme.toolbarHeight}px`};
	width: ${(props:any) => props.iconOnly ? `${props.theme.toolbarHeight}px` : 'auto'};
	${(props:any) => props.iconOnly ? `min-width: ${props.theme.toolbarHeight}px;` : ''}
	${(props:any) => props.iconOnly ? `max-width: ${props.theme.toolbarHeight}px;` : ''}
	box-sizing: border-box;
	border-radius: 3px;
	border-style: solid;
	border-width: 1px;
	font-size: ${(props:any) => props.theme.fontSize}px;
	padding: 0 ${(props:any) => props.iconOnly ? 4 : 8}px;
	justify-content: center;
`;

const StyledIcon = styled(styled.span(space))`
	font-size: ${(props:any) => props.theme.toolbarIconSize}px;
	${(props:any) => props.animation ? `animation: ${props.animation}` : ''};
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

	${StyledIcon} {
		color: ${(props:any) => props.theme.color5};
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

	${StyledIcon} {
		color: ${(props:any) => props.theme.color4};
	}
`;

const StyledButtonSideBarSecondary = styled(StyledButtonBase)`
	background: none;
	border-color: ${(props:any) => props.theme.colorFaded2};
	color: ${(props:any) => props.theme.colorFaded2};

	&:hover {
		color: ${(props:any) => props.theme.colorHover2};
		border-color: ${(props:any) => props.theme.colorHover2};
		background: none;

		${StyledTitle} {
			color: ${(props:any) => props.theme.colorHover2};
		}

		${StyledIcon} {
			color: ${(props:any) => props.theme.colorHover2};
		}
	}

	&:active {
		color: ${(props:any) => props.theme.colorActive2};
		border-color: ${(props:any) => props.theme.colorActive2};
		background: none;

		${StyledTitle} {
			color: ${(props:any) => props.theme.colorActive2};
		}

		${StyledIcon} {
			color: ${(props:any) => props.theme.colorActive2};
		}
	}

	${StyledTitle} {
		color: ${(props:any) => props.theme.colorFaded2};
	}

	${StyledIcon} {
		color: ${(props:any) => props.theme.colorFaded2};
	}
`;

function buttonClass(level:ButtonLevel) {
	if (level === ButtonLevel.Primary) return StyledButtonPrimary;
	if (level === ButtonLevel.SideBarSecondary) return StyledButtonSideBarSecondary;
	return StyledButtonSecondary;
}

export default function Button(props:Props) {
	const iconOnly = props.iconName && !props.title;

	const StyledButton = buttonClass(props.level);

	function renderIcon() {
		if (!props.iconName) return null;
		return <StyledIcon animation={props.iconAnimation} mr={iconOnly ? '0' : '6px'} color={props.color} className={props.iconName}/>;
	}

	function renderTitle() {
		if (!props.title) return null;
		return  <StyledTitle color={props.color}>{props.title}</StyledTitle>;
	}

	return (
		<StyledButton className={props.className} iconOnly={iconOnly} onClick={props.onClick}>
			{renderIcon()}
			{renderTitle()}
		</StyledButton>
	);
}
