import * as React from 'react';
import { CSSProperties, ReactNode } from 'react';

interface Props {
	// Where to anchor the panel relative to its positioned ancestor.
	// 'bottom-center' is the default — used for selection-context panels.
	position?: 'bottom-center' | 'top-center' | 'top-right';
	// Optional caption shown at the start of the bar (e.g. "1 connection").
	caption?: ReactNode;
	// Buttons / inputs / dividers shown in the bar.
	children?: ReactNode;
}

const baseStyle: CSSProperties = {
	position: 'absolute',
	zIndex: 10,
	display: 'flex',
	alignItems: 'center',
	gap: 0,
	padding: 4,
	background: '#ffffff',
	border: '1px solid #d8d8d8',
	borderRadius: 8,
	boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
	fontSize: 12,
	height: 36,
};

const positionStyles: Record<NonNullable<Props['position']>, CSSProperties> = {
	'bottom-center': { bottom: 16, left: '50%', transform: 'translateX(-50%)' },
	'top-center': { top: 16, left: '50%', transform: 'translateX(-50%)' },
	'top-right': { top: 8, right: 8 },
};

const captionStyle: CSSProperties = {
	color: '#666',
	padding: '0 10px',
	whiteSpace: 'nowrap',
};

const dividerStyle: CSSProperties = {
	width: 1,
	height: 20,
	background: '#e5e5e5',
	margin: '0 4px',
};

export const ActionPanel = ({ position = 'bottom-center', caption, children }: Props) => {
	const style: CSSProperties = { ...baseStyle, ...positionStyles[position] };
	return (
		<div style={style}>
			{caption ? (
				<>
					<div style={captionStyle}>{caption}</div>
					<div style={dividerStyle} />
				</>
			) : null}
			{children}
		</div>
	);
};

const buttonBase: CSSProperties = {
	height: 28,
	padding: '0 10px',
	fontSize: 12,
	border: 'none',
	background: 'transparent',
	color: '#333',
	cursor: 'pointer',
	borderRadius: 6,
	display: 'inline-flex',
	alignItems: 'center',
	gap: 4,
	whiteSpace: 'nowrap',
};

interface ActionButtonProps {
	onClick: ()=> void;
	active?: boolean;
	disabled?: boolean;
	title?: string;
	children: ReactNode;
}

export const ActionButton = ({ onClick, active, disabled, title, children }: ActionButtonProps) => {
	const style: CSSProperties = {
		...buttonBase,
		background: active ? '#eef4fc' : 'transparent',
		color: active ? '#2766b8' : '#333',
		opacity: disabled ? 0.45 : 1,
		cursor: disabled ? 'default' : 'pointer',
	};
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			style={style}
			onMouseEnter={e => { if (!disabled && !active) (e.currentTarget.style.background = '#f3f3f3'); }}
			onMouseLeave={e => { if (!active) (e.currentTarget.style.background = 'transparent'); }}
		>
			{children}
		</button>
	);
};

export const ActionDivider = () => <div style={dividerStyle} />;

const inputStyle: CSSProperties = {
	height: 24,
	padding: '0 8px',
	fontSize: 12,
	border: '1px solid #d8d8d8',
	borderRadius: 4,
	margin: '0 4px',
	outline: 'none',
};

interface ActionInputProps {
	value: string;
	placeholder?: string;
	width?: number;
	onChange: (value: string)=> void;
}

export const ActionInput = ({ value, placeholder, width = 140, onChange }: ActionInputProps) => (
	<input
		type="text"
		value={value}
		placeholder={placeholder}
		onChange={e => onChange(e.target.value)}
		style={{ ...inputStyle, width }}
	/>
);
