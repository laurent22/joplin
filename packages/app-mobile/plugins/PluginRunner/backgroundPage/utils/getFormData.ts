
const getFormData = () => {
	const forms = document.querySelectorAll('form');
	if (forms.length === 0) return null;

	const serializeForm = (form: HTMLFormElement) => {
		const formData = new FormData(form);
		const serializedData: Record<string, any> = {};
		for (const key of formData.keys()) {
			serializedData[key] = formData.get(key);
		}
		return serializedData;
	};

	const result = Object.create(null);
	let untitledFormId = 0;
	for (const form of forms) {
		const formId = form.getAttribute('name') || `form-${untitledFormId++}`;
		result[formId] = serializeForm(form);
	}

	return result;
};
export default getFormData;
