const React = require('react'); const Component = React.Component;
const { View, Text, StyleSheet } = require('react-native');
const { connect } = require('react-redux');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { ActionButton } = require('lib/components/action-button.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const { _ } = require('lib/locale.js');
const { themeStyle } = require('lib/components/global-style.js');

class WelcomeScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();
		this.styles_ = {};
	}

	styles() {
		const themeId = this.props.theme;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		let styles = {
			message: {
				margin: theme.margin,
				fontSize: theme.fontSize,
				color: theme.color,
			},
		};

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	render() {
		let message = this.props.folders.length ? _('Click on the (+) button to create a new note or notebook. Click on the side menu to access your existing notebooks.') : _('You currently have no notebook. Create one by clicking on (+) button.');

		return (
			<View style={this.rootStyle(this.props.theme).root} >
				<ScreenHeader title={_('Welcome')}/>
				<Text style={this.styles().message}>{message}</Text>
				<ActionButton addFolderNoteButtons={true} parentFolderId={this.props.selectedFolderId}/>
			</View>
		);
	}

}

const WelcomeScreen = connect(
	(state) => {
		return {
			folders: state.folders,
			theme: state.settings.theme,
			selectedFolderId: state.selectedFolderId,
		};
	}
)(WelcomeScreenComponent)

module.exports = { WelcomeScreen };