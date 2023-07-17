const { Dirnames } = require('./types');

export default (resourceId: string) => {
	return `${Dirnames.Resources}/${resourceId}`;
};
