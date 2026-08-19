import getProperty from './getProperty';

const getNumberProperty = (object: unknown, propertyName: string) => {
	const value = getProperty(object, propertyName);
	if (typeof value !== 'number') {
		throw new Error(`Property value is not a string (is ${typeof value})`);
	}
	return value;
};

export default getNumberProperty;
