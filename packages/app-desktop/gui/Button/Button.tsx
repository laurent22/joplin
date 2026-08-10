import * as React from 'react';
import styled from 'styled-components';
const { space } = require('styled-system');

type SpaceValue = number | string;
// The props for styled-system's space
interface SpaceProps {
	m?: SpaceValue;
	mt?: SpaceValue;
	mr?: SpaceValue;
	mb?: SpaceValue;
	ml?: SpaceValue;
	mx?: SpaceValue;
	my?: SpaceValue;
	p?: SpaceValue;
	pt?: SpaceValue;
	pr?: SpaceValue;
	pb?: SpaceValue;
	pl?: SpaceValue;
	px?: SpaceValue;
	py?: SpaceValue;
}

interface StyleProps {
	theme: {
		toolbarIconSize: number;
		backgroundColor3: string;
		backgroundColor4: string;
		backgroundColor5: string;
		backgroundColorActive3: string;
		backgroundColorActive4: string;
		backgroundColorActive5: string;
		backgroundColorHover4: string;
		backgroundColorHover5: string;
		backgroundColorHoverDim3: string;
		borderColor4: string;
		color: string;
		color2: string;
		color3: string;
		color4: string;
		color5: string;
		colorActive2: string;
		colorHover2: string;
		warningBackgroundColor: string;
	};
	animation?: string;
}

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

type ReactButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;
interface Props extends Omit<ReactButtonProps, 'onClick'>, SpaceProps {
	title?: string;
	iconName?: string;
	level?: ButtonLevel;
	iconLabel?: string;
	onClick?: ()=> void;
	color?: string;
	iconAnimation?: string;
	tooltip?: string;
	disabled?: boolean;
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

const StyledIcon = styled.span<SpaceProps & StyleProps>`
	${space}
	font-size: ${(props) => props.theme.toolbarIconSize}px;
	${(props) => props.animation ? `animation: ${props.animation}` : ''};
`;

const StyledButtonPrimary = styled(StyledButtonBase)`
	border: none;
	background-color: ${(props: StyleProps) => props.theme.backgroundColor5};

	&:not(:disabled) {
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

	&:not(:disabled) {
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

const Button = React.forwardRef(({
	iconName, iconLabel, iconAnimation, color, title, level, fontSize, isSquare, tooltip, disabled, onClick: propsOnClick, ...unusedProps
}: Props, ref: React.Ref<HTMLButtonElement>) => {
	const iconOnly = iconName && !title;

	const StyledButton = buttonClass(level);

	function renderIcon() {
		if (!iconName) return null;
		return <StyledIcon
			aria-label={iconLabel ?? undefined}
			aria-hidden={!iconLabel}
			animation={iconAnimation}
			mr={iconOnly ? '0' : '6px'}
			color={color}
			className={`${iconName} icon`}
			role='img'
		/>;
	}

	function renderTitle() {
		if (!title) return null;
		return <StyledTitle color={color}>{title}</StyledTitle>;
	}

	function onClick() {
		if (disabled) return;
		propsOnClick();
	}

	return (
		<StyledButton
			ref={ref}
			fontSize={fontSize}
			isSquare={isSquare}
			disabled={disabled}
			title={tooltip}
			iconOnly={iconOnly}
			onClick={onClick}

			// When there's no title, the button needs a label. In this case, fall back
			// to the tooltip.
			aria-label={title ? undefined : tooltip}
			aria-disabled={disabled}
			{...unusedProps}
		>
			{renderIcon()}
			{renderTitle()}
		</StyledButton>
	);
});

export default styled(Button)`${space}`;
