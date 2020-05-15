const { check, request, RESULTS } = require('react-native-permissions');

export default async (permissions: string) => {
	let granted = await check(permissions);
	if (granted !== RESULTS.GRANTED) {
		granted = await request(permissions);
	}
	return granted === RESULTS.GRANTED;
};
