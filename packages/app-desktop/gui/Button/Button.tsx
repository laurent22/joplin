import * as React from 'react';
const styled = require('styled-components').default;
const { space } = require('styled-system');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied;
type StyleProps = any;

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
	iconLabel?: string;
	className?: string;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onClick?: Function;
	color?: string;
	iconAnimation?: string;
	tooltip?: string;
	disabled?: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied;
	style?: any;
	size?: ButtonSize;
	isSquare?: boolean;
	iconOnly?: boolean;
	fontSize?: number;
}

const StyledTitle = styled.span`

`;

export const buttonSizePx = (props: Props | ButtonSize) => {
	const buttonSize = typeof props === 'number' ? props : props.size;
	if (!buttonSize || buttonSize === ButtonSize.Normal) return 32;
	if (buttonSize === ButtonSize.Small) return 26;
	throw new Error(`Unknown size: ${buttonSize}`);
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
	font-size: ${(props: StyleProps) => props.theme.toolbarIconSize}px;
	${(props: StyleProps) => props.animation ? `animation: ${props.animation}` : ''};
`;

const StyledButtonPrimary = styled(StyledButtonBase)`
	border: none;
	background-color: ${(props: StyleProps) => props.theme.backgroundColor5};

	${(props: StyleProps) => props.disabled} {
		&:hover {
			background-color: ${(props: StyleProps) => props.theme.backgroundColorHover5};
		}

		&:active {
			background-color: ${(props: StyleProps) => props.theme.backgroundColorActive5};
		}
	}

	${StyledIcon} {
		color: ${(props: StyleProps) => props.theme.color5};
	}

	${StyledTitle} {
		color: ${(props: StyleProps) => props.theme.color5};
	}
`;

const StyledButtonSecondary = styled(StyledButtonBase)`
	border: 1px solid ${(props: StyleProps) => props.theme.borderColor4};
	background-color: ${(props: StyleProps) => props.theme.backgroundColor4};

	${(props: StyleProps) => props.disabled} {
		&:hover {
			background-color: ${(props: StyleProps) => props.theme.backgroundColorHover4};
		}

		&:active {
			background-color: ${(props: StyleProps) => props.theme.backgroundColorActive4};
		}
	}

	${StyledIcon} {
		color: ${(props: StyleProps) => props.theme.color4};
	}

	${StyledTitle} {
		color: ${(props: StyleProps) => props.theme.color4};
	}
`;

const StyledButtonTertiary = styled(StyledButtonBase)`
	border: 1px solid ${(props: StyleProps) => props.theme.color3};
	background-color: ${(props: StyleProps) => props.theme.backgroundColor3};

	&:hover {
		background-color: ${(props: StyleProps) => props.theme.backgroundColorHoverDim3};
	}

	&:active {
		background-color: ${(props: StyleProps) => props.theme.backgroundColorActive3};
	}

	${StyledIcon} {
		color: ${(props: StyleProps) => props.theme.color};
	}

	${StyledTitle} {
		color: ${(props: StyleProps) => props.theme.color};
		opacity: 0.9;
	}
`;

const StyledButtonRecommended = styled(StyledButtonBase)`
	border: 1px solid ${(props: StyleProps) => props.theme.borderColor4};
	background-color: ${(props: StyleProps) => props.theme.warningBackgroundColor};

	${StyledIcon} {
		color: ${(props: StyleProps) => props.theme.color};
	}

	${StyledTitle} {
		color: ${(props: StyleProps) => props.theme.color};
		opacity: 0.9;
	}
`;

const StyledButtonSidebarSecondary = styled(StyledButtonBase)`
	background: none;
	border-color: ${(props: StyleProps) => props.theme.color2};
	color: ${(props: StyleProps) => props.theme.color2};

	&:hover {
		color: ${(props: StyleProps) => props.theme.colorHover2};
		border-color: ${(props: StyleProps) => props.theme.colorHover2};
		background: none;

		${StyledTitle} {
			color: ${(props: StyleProps) => props.theme.colorHover2};
		}

		${StyledIcon} {
			color: ${(props: StyleProps) => props.theme.colorHover2};
		}
	}

	&:active {
		color: ${(props: StyleProps) => props.theme.colorActive2};
		border-color: ${(props: StyleProps) => props.theme.colorActive2};
		background: none;

		${StyledTitle} {
			color: ${(props: StyleProps) => props.theme.colorActive2};
		}

		${StyledIcon} {
			color: ${(props: StyleProps) => props.theme.colorActive2};
		}
	}

	${StyledTitle} {
		color: ${(props: StyleProps) => props.theme.color2};
	}

	${StyledIcon} {
		color: ${(props: StyleProps) => props.theme.color2};
	}
`;

function buttonClass(level: ButtonLevel) {
	if (level === ButtonLevel.Primary) return StyledButtonPrimary;
	if (level === ButtonLevel.Tertiary) return StyledButtonTertiary;
	if (level === ButtonLevel.SidebarSecondary) return StyledButtonSidebarSecondary;
	if (level === ButtonLevel.Recommended) return StyledButtonRecommended;
	return StyledButtonSecondary;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied;
const Button = React.forwardRef((props: Props, ref: any) => {
	const iconOnly = props.iconName && !props.title;

	const StyledButton = buttonClass(props.level);

	function renderIcon() {
		if (!props.iconName) return null;
		return <StyledIcon aria-label={props.iconLabel} animation={props.iconAnimation} mr={iconOnly ? '0' : '6px'} color={props.color} className={props.iconName}/>;
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
