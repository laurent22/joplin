import { ImportErrors } from './types';

export default function(previousErrors: ImportErrors, newErrors: ImportErrors): boolean {
	if (Object.keys(previousErrors).length !== Object.keys(newErrors).length) return true;

	for (const packageName of Object.keys(previousErrors)) {
		if (newErrors[packageName] !== previousErrors[packageName]) return true;
	}

	return false;
}
