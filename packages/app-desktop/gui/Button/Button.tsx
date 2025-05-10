import * as React from 'react';
import styled from 'styled-components';
import { space, SpaceProps } from 'styled-system';

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

interface ButtonProps extends SpaceProps {
	title?: string;
	iconName?: string;
	level?: ButtonLevel;
	iconLabel?: string;
	className?: string;
	onClick?: ()=> void;
	color?: string;
	iconAnimation?: string;
	tooltip?: string;
	disabled?: boolean;
	size?: ButtonSize;
	isSquare?: boolean;
	iconOnly?: boolean;
	fontSize?: number;
	'aria-controls'?: string;
	'aria-describedby'?: string;
	'aria-expanded'?: string;
}

const buttonSizePx = (props: ButtonProps) => {
	const buttonSize = props.size ?? ButtonSize.Normal;
	if (buttonSize === ButtonSize.Small) return 26;
	if (buttonSize === ButtonSize.Normal) return 32;
	throw new Error(`Unknown size: ${buttonSize}`);
};

const isSquare = (props: ButtonProps) => props.iconOnly || props.isSquare;

const StyledButtonBase = styled.button<ButtonProps>`
  display: flex;
  align-items: center;
  flex-direction: row;
  height: ${(props) => buttonSizePx(props)}px;
  min-height: ${(props) => buttonSizePx(props)}px;
  max-height: ${(props) => buttonSizePx(props)}px;
  width: ${(props) => (isSquare(props) ? `${buttonSizePx(props)}px` : 'auto')};
  min-width: ${(props) => (isSquare(props) ? `${buttonSizePx(props)}px` : '100px')};
  max-width: ${(props) => (isSquare(props) ? `${buttonSizePx(props)}px` : 'none')};
  box-sizing: border-box;
  border-radius: 3px;
  border-style: solid;
  border-width: 1px;
  padding: 0 ${(props) => (isSquare(props) ? 4 : 14)}px;
  justify-content: center;
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
  user-select: none;
  font-size: ${(props) => props.fontSize ?? 'inherit'};
`;

const StyledIcon = styled.span<{ animation?: string }>`
  font-size: ${(props) => props.theme.toolbarIconSize}px;
  ${(props) => props.animation && `animation: ${props.animation}`};
`;

const StyledButtonPrimary = styled(StyledButtonBase)`
  border: none;
  background-color: ${(props) => props.theme.backgroundColor5};

  &:hover {
    background-color: ${(props) => props.theme.backgroundColorHover5};
  }

  &:active {
    background-color: ${(props) => props.theme.backgroundColorActive5};
  }

  ${StyledIcon} {
    color: ${(props) => props.theme.color5};
  }
`;

const StyledButtonSecondary = styled(StyledButtonBase)`
  border: 1px solid ${(props) => props.theme.borderColor4};
  background-color: ${(props) => props.theme.backgroundColor4};

  &:hover {
    background-color: ${(props) => props.theme.backgroundColorHover4};
  }

  &:active {
    background-color: ${(props) => props.theme.backgroundColorActive4};
  }

  ${StyledIcon} {
    color: ${(props) => props.theme.color4};
  }
`;

const StyledButtonTertiary = styled(StyledButtonBase)`
  border: 1px solid ${(props) => props.theme.color3};
  background-color: ${(props) => props.theme.backgroundColor3};

  &:hover {
    background-color: ${(props) => props.theme.backgroundColorHoverDim3};
  }

  &:active {
    background-color: ${(props) => props.theme.backgroundColorActive3};
  }

  ${StyledIcon} {
    color: ${(props) => props.theme.color};
  }
`;

const StyledButtonRecommended = styled(StyledButtonBase)`
  border: 1px solid ${(props) => props.theme.borderColor4};
  background-color: ${(props) => props.theme.warningBackgroundColor};

  ${StyledIcon} {
    color: ${(props) => props.theme.color};
  }
`;

const StyledButtonSidebarSecondary = styled(StyledButtonBase)`
  background: none;
  border-color: ${(props) => props.theme.color2};
  color: ${(props) => props.theme.color2};

  &:hover {
    color: ${(props) => props.theme.colorHover2};
    border-color: ${(props) => props.theme.colorHover2};
  }

  &:active {
    color: ${(props) => props.theme.colorActive2};
    border-color: ${(props) => props.theme.colorActive2};
  }

  ${StyledIcon} {
    color: ${(props) => props.theme.color2};
  }
`;

const buttonClass = (level: ButtonLevel) => {
	switch (level) {
	case ButtonLevel.Primary:
		return StyledButtonPrimary;
	case ButtonLevel.Tertiary:
		return StyledButtonTertiary;
	case ButtonLevel.SidebarSecondary:
		return StyledButtonSidebarSecondary;
	case ButtonLevel.Recommended:
		return StyledButtonRecommended;
	default:
		return StyledButtonSecondary;
	}
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
	const { iconName, title, iconLabel, iconAnimation, onClick, disabled, size, color, fontSize, isSquare, className, tooltip, ...rest } = props;
	const StyledButton = buttonClass(props.level ?? ButtonLevel.Secondary);

	const renderIcon = () => {
		if (!iconName) return null;
		return (
			<StyledIcon
				aria-label={iconLabel ?? undefined}
				aria-hidden={!iconLabel}
				animation={iconAnimation}
				color={color}
				className={iconName}
				mr={props.iconOnly ? 0 : 6}
				role="img"
			/>
		);
	};

	const renderTitle = () => {
		if (!title) return null;
		return <span style={{ color }}>{title}</span>;
	};

	return (
		<StyledButton
			ref={ref}
			disabled={disabled}
			fontSize={fontSize}
			isSquare={isSquare}
			size={size}
			onClick={disabled ? undefined : onClick}
			title={tooltip}
			className={className}
			aria-label={title ? undefined : tooltip}
			{...rest}
		>
			{renderIcon()}
			{renderTitle()}
		</StyledButton>
	);
});

export default styled(Button)`
  ${space}
`;
