import * as React from 'react';
import { useMemo, useCallback } from 'react';

export type DropdownOptions = Record<string, string>;
export enum DropdownVariant {
	Default = 1,
	NoBorder,
}

export interface ChangeEvent {
	value: string;
}

export type ChangeEventHandler = (event: ChangeEvent)=> void;

interface Props {
	options: DropdownOptions;
	variant?: DropdownVariant;
	className?: string;
	onChange?: ChangeEventHandler;
	value?: string;
	disabled?: boolean;
}

export const Dropdown = (props: Props) => {
	const renderOptions = () => {
		const optionComps = [];
		for (const [value, label] of Object.entries(props.options)) {
			optionComps.push(<option key={value} value={value}>{label}</option>);
		}
		return optionComps;
	};

	const onChange = useCallback((event: any) => {
		props.onChange({ value: event.target.value });
	}, [props.onChange]);

	const classNames = useMemo(() => {
		const variant = props.variant || DropdownVariant.Default;
		const output = [
			'dropdown-control',
			`-variant${variant}`,
		];
		if (props.className) output.push(props.className);
		return output.join(' ');
	}, [props.variant, props.className]);

	return (
		<select disabled={props.disabled} className={classNames} onChange={onChange} value={props.value}>
			{renderOptions()}
		</select>
	);
};
