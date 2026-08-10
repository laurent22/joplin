import * as React from 'react';
import { ReactNode, useEffect, useRef } from 'react';
import { focus } from '@joplin/lib/utils/focusHandler';

interface Props {
	position?: 'bottom-center' | 'top-center' | 'top-right';
	caption?: ReactNode;
	children?: ReactNode;
}

export const ActionPanel = ({ position = 'bottom-center', caption, children }: Props) => {
	return (
		<div className={`whiteboard-action-panel -${position}`}>
			{caption ? (
				<>
					<div className="caption">{caption}</div>
					<div className="divider" />
				</>
			) : null}
			{children}
		</div>
	);
};

interface ActionButtonProps {
	onClick: ()=> void;
	active?: boolean;
	disabled?: boolean;
	title?: string;
	children: ReactNode;
}

export const ActionButton = ({ onClick, active, disabled, title, children }: ActionButtonProps) => {
	const classes = ['button'];
	if (active) classes.push('-active');
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			aria-label={title}
			aria-pressed={active}
			className={classes.join(' ')}
		>
			{children}
		</button>
	);
};

export const ActionDivider = () => <div className="divider" />;

interface ActionSwatchProps {
	color: string | null;
	active?: boolean;
	title?: string;
	onClick: ()=> void;
}

export const ActionSwatch = ({ color, active, title, onClick }: ActionSwatchProps) => {
	const classes = ['swatch'];
	if (active) classes.push('-active');
	if (color === null) classes.push('-none');
	return (
		<button
			type="button"
			onClick={onClick}
			title={title}
			aria-label={title}
			aria-pressed={active}
			className={classes.join(' ')}
			style={color ? { background: color } : undefined}
		/>
	);
};

interface ActionInputProps {
	value: string;
	placeholder?: string;
	width?: number;
	// Incrementing this token requests focus + select-all on the input. Using a
	// counter (rather than a boolean) lets the caller re-trigger focus even
	// when the token was already truthy on a previous render.
	focusToken?: number;
	onChange: (value: string)=> void;
}

export const ActionInput = ({ value, placeholder, width = 140, focusToken, onChange }: ActionInputProps) => {
	const inputRef = useRef<HTMLInputElement | null>(null);
	// Skip the initial effect fire: we only want to grab focus when the caller
	// bumps the token, not on mount (single-clicking an edge would otherwise
	// steal focus and let stray keystrokes overwrite the label).
	const lastFocusTokenRef = useRef(focusToken);
	useEffect(() => {
		if (focusToken === undefined) return;
		if (focusToken === lastFocusTokenRef.current) return;
		lastFocusTokenRef.current = focusToken;
		const input = inputRef.current;
		if (!input) return;
		focus('ActionInput::focusToken', input);
		input.select();
	}, [focusToken]);
	return (
		<input
			ref={inputRef}
			type="text"
			value={value}
			placeholder={placeholder}
			aria-label={placeholder}
			onChange={e => onChange(e.target.value)}
			className="input"
			style={{ width }}
		/>
	);
};
