import { themeStyle } from '../components/global-style';

export default (themeId: number) => {
	const theme = themeStyle(themeId);
	return {
		root: theme.rootStyle,
	};
};
