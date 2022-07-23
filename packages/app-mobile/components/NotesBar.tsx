const React = require('react');
const { View, Text, StyleSheet } = require('react-native');
import { State } from '@joplin/lib/reducer';
import { themeStyle } from './global-style';
const { connect } = require('react-redux');
// const Icon = require('react-native-vector-icons/Ionicons').default;

interface Props {
    themeId: string;
}

function NotesBarComponent(props: Props) {

	function styles() {
		const themeId = props.themeId;
		const theme = themeStyle(themeId);

		let styles = {
			container: {
				width: 250,
				backgroundColor: theme.backgroundColor3,
			},

		};

		styles = StyleSheet.create(styles);

		return styles;
	}


	return (
		<View style={styles().container}>
			<Text style={{ color: '#fff' }}>Sample Code</Text>
		</View>
	);
}

const NotesBar = connect((state: State) => {
	return {
		themeId: state.settings.theme,
	};
})(NotesBarComponent);

export default NotesBar;


