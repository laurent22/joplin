import getProperty from './getProperty';

const getStringProperty = (object: unknown, propertyName: string) => {
	const value = getProperty(object, propertyName);
	if (typeof value !== 'string') {
		throw new Error(`Property value is not a string (is ${typeof value})`);
	}
	return value;
};

export default getStringProperty;
