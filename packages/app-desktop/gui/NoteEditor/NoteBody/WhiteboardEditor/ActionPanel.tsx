import * as React from 'react';
import { CSSProperties, ReactNode, useMemo } from 'react';
import { useWhiteboardContext } from './WhiteboardContext';
import { whiteboardColors, WhiteboardThemeColors } from './theme';

interface Props {
	// Where to anchor the panel relative to its positioned ancestor.
	// 'bottom-center' is the default — used for selection-context panels.
	position?: 'bottom-center' | 'top-center' | 'top-right';
	// Optional caption shown at the start of the bar (e.g. "1 connection").
	caption?: ReactNode;
	// Buttons / inputs / dividers shown in the bar.
	children?: ReactNode;
}

const positionStyles: Record<NonNullable<Props['position']>, CSSProperties> = {
	'bottom-center': { bottom: 16, left: '50%', transform: 'translateX(-50%)' },
	'top-center': { top: 16, left: '50%', transform: 'translateX(-50%)' },
	'top-right': { top: 8, right: 8 },
};

const baseStyle = (colors: WhiteboardThemeColors): CSSProperties => ({
	position: 'absolute',
	zIndex: 10,
	display: 'flex',
	alignItems: 'center',
	gap: 0,
	padding: 4,
	background: colors.cardBackground,
	border: `1px solid ${colors.cardBorder}`,
	borderRadius: 8,
	boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
	fontSize: 12,
	height: 36,
	color: colors.textColor,
});

const captionStyle = (colors: WhiteboardThemeColors): CSSProperties => ({
	color: colors.mutedColor,
	padding: '0 10px',
	whiteSpace: 'nowrap',
});

const dividerStyle = (colors: WhiteboardThemeColors): CSSProperties => ({
	width: 1,
	height: 20,
	background: colors.dividerColor,
	margin: '0 4px',
});

export const ActionPanel = ({ position = 'bottom-center', caption, children }: Props) => {
	const ctx = useWhiteboardContext();
	const colors = useMemo(() => whiteboardColors(ctx.themeId), [ctx.themeId]);
	const style: CSSProperties = { ...baseStyle(colors), ...positionStyles[position] };
	return (
		<div style={style}>
			{caption ? (
				<>
					<div style={captionStyle(colors)}>{caption}</div>
					<div style={dividerStyle(colors)} />
				</>
			) : null}
			{children}
		</div>
	);
};

const buttonBase = (colors: WhiteboardThemeColors): CSSProperties => ({
	height: 28,
	padding: '0 10px',
	fontSize: 12,
	border: 'none',
	background: 'transparent',
	color: colors.textColor,
	cursor: 'pointer',
	borderRadius: 6,
	display: 'inline-flex',
	alignItems: 'center',
	gap: 4,
	whiteSpace: 'nowrap',
});

interface ActionButtonProps {
	onClick: ()=> void;
	active?: boolean;
	disabled?: boolean;
	title?: string;
	children: ReactNode;
}

export const ActionButton = ({ onClick, active, disabled, title, children }: ActionButtonProps) => {
	const ctx = useWhiteboardContext();
	const colors = useMemo(() => whiteboardColors(ctx.themeId), [ctx.themeId]);
	// "Active" tint is a translucent brand blue overlay so it reads on both
	// light and dark backgrounds without needing a second hex value.
	const activeBg = 'rgba(74, 144, 226, 0.18)';
	const activeFg = '#2766b8';
	const hoverBg = 'rgba(127,127,127,0.12)';
	const style: CSSProperties = {
		...buttonBase(colors),
		background: active ? activeBg : 'transparent',
		color: active ? activeFg : colors.textColor,
		opacity: disabled ? 0.45 : 1,
		cursor: disabled ? 'default' : 'pointer',
	};
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			// Many ActionButtons render only a glyph (—, →, ↔ …) whose Unicode
			// name isn't a useful accessible name. Mirror `title` into
			// aria-label so screen readers and voice-control users get the
			// human-readable label the tooltip already shows.
			aria-label={title}
			aria-pressed={active}
			style={style}
			onMouseEnter={e => { if (!disabled && !active) (e.currentTarget.style.background = hoverBg); }}
			onMouseLeave={e => { if (!active) (e.currentTarget.style.background = 'transparent'); }}
		>
			{children}
		</button>
	);
};

export const ActionDivider = () => {
	const ctx = useWhiteboardContext();
	const colors = useMemo(() => whiteboardColors(ctx.themeId), [ctx.themeId]);
	return <div style={dividerStyle(colors)} />;
};

const inputStyle = (colors: WhiteboardThemeColors): CSSProperties => ({
	height: 24,
	padding: '0 8px',
	fontSize: 12,
	border: `1px solid ${colors.cardBorder}`,
	borderRadius: 4,
	margin: '0 4px',
	background: colors.cardBackground,
	color: colors.textColor,
	// Keep the browser's default focus ring for keyboard accessibility — do
	// not set `outline: 'none'`.
});

interface ActionInputProps {
	value: string;
	placeholder?: string;
	width?: number;
	onChange: (value: string)=> void;
}

export const ActionInput = ({ value, placeholder, width = 140, onChange }: ActionInputProps) => {
	const ctx = useWhiteboardContext();
	const colors = useMemo(() => whiteboardColors(ctx.themeId), [ctx.themeId]);
	return (
		<input
			type="text"
			value={value}
			placeholder={placeholder}
			// Without a visible <label> the placeholder is the only label a
			// screen reader / voice-control user has to identify the field.
			aria-label={placeholder}
			onChange={e => onChange(e.target.value)}
			style={{ ...inputStyle(colors), width }}
		/>
	);
};
