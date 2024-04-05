interface Option {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	value: any;
	label: string;
	selected: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
type LabelFn = (key: string, value: any)=> string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function yesNoDefaultLabel(_key: string, value: any): string {
	if (value === '') return 'Default';
	return value ? 'Yes' : 'No';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function objectToSelectOptions(object: any, selectedValue: any, labelFn: LabelFn): Option[] {
	const output: Option[] = [];
	for (const [key, value] of Object.entries(object)) {
		output.push({
			label: labelFn(key, value),
			selected: value === selectedValue,
			value: value,
		});
	}
	return output;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function selectOption(label: string, value: any, selected: boolean): Option {
	return { label, value, selected };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function yesNoDefaultOptions(object: any, key: string): Option[] {
	return [
		selectOption('Default', '', object[key] === null),
		selectOption('Yes', '1', object[key] === 1),
		selectOption('No', '0', object[key] === 0),
	];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function yesNoOptions(object: any, key: string): Option[] {
	return [
		selectOption('Yes', '1', object[key] === 1),
		selectOption('No', '0', object[key] === 0),
	];
}
