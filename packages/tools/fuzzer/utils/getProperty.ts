
const getProperty = (object: unknown, propertyName: string) => {
	if (typeof object !== 'object' || object === null) {
		throw new Error(`Cannot access property ${JSON.stringify(propertyName)} on non-object`);
	}

	if (!(propertyName in object)) {
		throw new Error(
			`No such property ${JSON.stringify(propertyName)} in object. Available keys: (${JSON.stringify(Object.keys(object))})`,
		);
	}

	return object[propertyName as keyof object];
};

export default getProperty;

