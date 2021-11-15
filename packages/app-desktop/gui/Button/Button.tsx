import * as React from 'react';
const styled = require('styled-components').default;
const { space } = require('styled-system');

export enum ButtonLevel {
	Primary = 'primary',
	Secondary = 'secondary',
	Tertiary = 'tertiary',
	SidebarSecondary = 'sidebarSecondary',
	Recommended = 'recommended',
}

export enum ButtonSize {
	Small = 1,
	Normal = 2,
}

interface Props {
	title?: string;
	iconName?: string;
	level?: ButtonLevel;
	className?: string;
	onClick?: Function;
	color?: string;
	iconAnimation?: string;
	tooltip?: string;
	disabled?: boolean;
	style?: any;
	size?: ButtonSize;
	isSquare?: boolean;
	iconOnly?: boolean;
	fontSize?: number;
}

const StyledTitle = styled.span`

`;

// const buttonSizePx = 32;

export const buttonSizePx = (props: Props) => {
	if (!props.size || props.size === ButtonSize.Normal) return 32;
	if (props.size === ButtonSize.Small) return 26;
	throw new Error(`Unknown size: ${props.size}`);
};

const isSquare = (props: Props) => {
	return props.iconOnly || props.isSquare;
};

const StyledButtonBase = styled.button`
	display: flex;
	align-items: center;
	flex-direction: row;
	height: ${(props: Props) => buttonSizePx(props)}px;
	min-height: ${(props: Props) => buttonSizePx(props)}px;
	max-height: ${(props: Props) => buttonSizePx(props)}px;
	width: ${(props: Props) => isSquare(props) ? `${buttonSizePx(props)}px` : 'auto'};
	${(props: Props) => isSquare(props) ? `min-width: ${buttonSizePx(props)}px;` : ''}
	${(props: Props) => !isSquare(props) ? 'min-width: 100px;' : ''}
	${(props: Props) => isSquare(props) ? `max-width: ${buttonSizePx(props)}px;` : ''}
	box-sizing: border-box;
	border-radius: 3px;
	border-style: solid;
	border-width: 1px;
	padding: 0 ${(props: Props) => isSquare(props) ? 4 : 14}px;
	justify-content: center;
	opacity: ${(props: Props) => props.disabled ? 0.5 : 1};
	user-select: none;
	${(props: Props) => props.fontSize ? `font-size: ${props.fontSize}px;` : ''}
`;

const StyledIcon = styled(styled.span(space))`
	font-size: ${(props: any) => props.theme.toolbarIconSize}px;
	${(props: any) => props.animation ? `animation: ${props.animation}` : ''};
`;

const StyledButtonPrimary = styled(StyledButtonBase)`
	border: none;
	background-color: ${(props: any) => props.theme.backgroundColor5};

	${(props: any) => props.disabled} {
		&:hover {
			background-color: ${(props: any) => props.theme.backgroundColorHover5};
		}

		&:active {
			background-color: ${(props: any) => props.theme.backgroundColorActive5};
		}
	}

	${StyledIcon} {
		color: ${(props: any) => props.theme.color5};
	}

	${StyledTitle} {
		color: ${(props: any) => props.theme.color5};
	}
`;

const StyledButtonSecondary = styled(StyledButtonBase)`
	border: 1px solid ${(props: any) => props.theme.borderColor4};
	background-color: ${(props: any) => props.theme.backgroundColor4};

	${(props: any) => props.disabled} {
		&:hover {
			background-color: ${(props: any) => props.theme.backgroundColorHover4};
		}

		&:active {
			background-color: ${(props: any) => props.theme.backgroundColorActive4};
		}
	}

	${StyledIcon} {
		color: ${(props: any) => props.theme.color4};
	}

	${StyledTitle} {
		color: ${(props: any) => props.theme.color4};
	}
`;

const StyledButtonTertiary = styled(StyledButtonBase)`
	border: 1px solid ${(props: any) => props.theme.color3};
	background-color: ${(props: any) => props.theme.backgroundColor3};

	&:hover {
		background-color: ${(props: any) => props.theme.backgroundColorHoverDim3};
	}

	&:active {
		background-color: ${(props: any) => props.theme.backgroundColorActive3};
	}

	${StyledIcon} {
		color: ${(props: any) => props.theme.color};
	}

	${StyledTitle} {
		color: ${(props: any) => props.theme.color};
		opacity: 0.9;
	}
`;

const StyledButtonRecommended = styled(StyledButtonBase)`
	border: 1px solid ${(props: any) => props.theme.borderColor4};
	background-color: ${(props: any) => props.theme.warningBackgroundColor};

	${StyledIcon} {
		color: ${(props: any) => props.theme.color};
	}

	${StyledTitle} {
		color: ${(props: any) => props.theme.color};
		opacity: 0.9;
	}
`;

const StyledButtonSidebarSecondary = styled(StyledButtonBase)`
	background: none;
	border-color: ${(props: any) => props.theme.color2};
	color: ${(props: any) => props.theme.color2};

	&:hover {
		color: ${(props: any) => props.theme.colorHover2};
		border-color: ${(props: any) => props.theme.colorHover2};
		background: none;

		${StyledTitle} {
			color: ${(props: any) => props.theme.colorHover2};
		}

		${StyledIcon} {
			color: ${(props: any) => props.theme.colorHover2};
		}
	}

	&:active {
		color: ${(props: any) => props.theme.colorActive2};
		border-color: ${(props: any) => props.theme.colorActive2};
		background: none;

		${StyledTitle} {
			color: ${(props: any) => props.theme.colorActive2};
		}

		${StyledIcon} {
			color: ${(props: any) => props.theme.colorActive2};
		}
	}

	${StyledTitle} {
		color: ${(props: any) => props.theme.color2};
	}

	${StyledIcon} {
		color: ${(props: any) => props.theme.color2};
	}
`;

function buttonClass(level: ButtonLevel) {
	if (level === ButtonLevel.Primary) return StyledButtonPrimary;
	if (level === ButtonLevel.Tertiary) return StyledButtonTertiary;
	if (level === ButtonLevel.SidebarSecondary) return StyledButtonSidebarSecondary;
	if (level === ButtonLevel.Recommended) return StyledButtonRecommended;
	return StyledButtonSecondary;
}

const Button = React.forwardRef((props: Props, ref: any) => {
	const iconOnly = props.iconName && !props.title;

	const StyledButton = buttonClass(props.level);

	function renderIcon() {
		if (!props.iconName) return null;
		return <StyledIcon animation={props.iconAnimation} mr={iconOnly ? '0' : '6px'} color={props.color} className={props.iconName}/>;
	}

	function renderTitle() {
		if (!props.title) return null;
		return <StyledTitle color={props.color}>{props.title}</StyledTitle>;
	}

	function onClick() {
		if (props.disabled) return;
		props.onClick();
	}

	return (
		<StyledButton ref={ref} fontSize={props.fontSize} isSquare={props.isSquare} size={props.size} style={props.style} disabled={props.disabled} title={props.tooltip} className={props.className} iconOnly={iconOnly} onClick={onClick}>
			{renderIcon()}
			{renderTitle()}
		</StyledButton>
	);
});

export default styled(Button)`${space}`;
