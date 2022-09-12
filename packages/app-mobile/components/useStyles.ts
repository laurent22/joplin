import { StyleSheet } from 'react-native';
import { Style } from './global-style';
import { themeStyle } from './global-style';

const useStyles = (stylingFunction: (theme: Style)=> Style, themeId?: number) => {
	const theme = themeStyle(themeId);
	const styles = stylingFunction(theme);

	return StyleSheet.create(styles);
};

export default useStyles;
