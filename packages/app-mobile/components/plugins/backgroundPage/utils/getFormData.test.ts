/** @jest-environment jsdom */
import getFormData from './getFormData';

describe('getFormData', () => {
	afterEach(() => {
		// Remove all forms to prevent tests from conflicting -- getFormData
		// uses document.querySelectorAll to select all forms.
		document.body.replaceChildren();
	});

	const addTextInputWithValue = (parent: HTMLElement, value: string, name: string) => {
		const input = document.createElement('input');
		input.name = name;
		input.value = value;
		parent.appendChild(input);
	};

	test('should return data for all forms', () => {
		const testForm1 = document.createElement('form');
		testForm1.setAttribute('name', 'test-form-1');
		addTextInputWithValue(testForm1, 'Test', 'input');
		addTextInputWithValue(testForm1, 'Test2', 'another-input');
		document.body.appendChild(testForm1);

		const testForm2 = document.createElement('form');
		testForm2.setAttribute('name', 'another-test-form');
		addTextInputWithValue(testForm2, 'Test2', 'text-input');
		document.body.appendChild(testForm2);

		expect(getFormData()).toMatchObject({
			'test-form-1': {
				'input': 'Test',
				'another-input': 'Test2',
			},
			'another-test-form': {
				'text-input': 'Test2',
			},
		});
	});

	test('should auto-number forms without a name', () => {
		for (let i = 0; i < 3; i++) {
			const testForm = document.createElement('form');
			addTextInputWithValue(testForm, `Form ${i}`, 'input');
			document.body.appendChild(testForm);
		}

		const formData = getFormData();
		expect(Object.keys(formData)).toHaveLength(3);
		expect(formData['form-0']).toMatchObject({ 'input': 'Form 0' });
		expect(formData['form-1']).toMatchObject({ 'input': 'Form 1' });
		expect(formData['form-2']).toMatchObject({ 'input': 'Form 2' });
	});
});
