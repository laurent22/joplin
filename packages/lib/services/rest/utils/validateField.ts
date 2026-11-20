import { ErrorBadRequest } from './errors';

const validateField = (field: string) => {
	if (typeof field !== 'string' || !field.match(/^[a-z0-9_]{1,100}$/ig)) {
		throw new ErrorBadRequest(`Invalid field: ${JSON.stringify(field)}`);
	}

	return field;
};

export default validateField;
