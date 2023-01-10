const { themeStyle } = require('../components/global-style');

export default (themeId: number) => {
	const theme = themeStyle(themeId);
	return {
		root: {
			flex: 1,
			backgroundColor: theme.backgroundColor,
		},
	};
};
