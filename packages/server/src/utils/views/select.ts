interface Option {
	value: any;
	label: string;
	selected: boolean;
}

type LabelFn = (key: string, value: any)=> string;

export function yesNoDefaultLabel(_key: string, value: any): string {
	if (value === '') return 'Default';
	return value ? 'Yes' : 'No';
}

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

export function selectOption(label: string, value: any, selected: boolean): Option {
	return { label, value, selected };
}

export function yesNoDefaultOptions(object: any, key: string): Option[] {
	return [
		selectOption('Default', '', object[key] === null),
		selectOption('Yes', '1', object[key] === 1),
		selectOption('No', '0', object[key] === 0),
	];
}

export function yesNoOptions(object: any, key: string): Option[] {
	return [
		selectOption('Yes', '1', object[key] === 1),
		selectOption('No', '0', object[key] === 0),
	];
}
