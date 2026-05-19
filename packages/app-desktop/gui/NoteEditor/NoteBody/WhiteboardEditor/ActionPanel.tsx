import * as React from 'react';
import { ReactNode } from 'react';

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

interface ActionInputProps {
	value: string;
	placeholder?: string;
	width?: number;
	onChange: (value: string)=> void;
}

export const ActionInput = ({ value, placeholder, width = 140, onChange }: ActionInputProps) => {
	return (
		<input
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
