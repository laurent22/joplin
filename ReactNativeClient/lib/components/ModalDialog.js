const React = require('react');
const { Text, Modal, View, StyleSheet, Button } = require('react-native');
const { themeStyle } = require('lib/components/global-style.js');
const { _ } = require('lib/locale');

class ModalDialog extends React.Component {
	constructor() {
		super();
		this.styles_ = {};
	}

	styles() {
		const themeId = this.props.theme;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		const styles = {
			modalWrapper: {
				flex: 1,
				justifyContent: 'center',
			},
			modalContentWrapper: {
				flex: 1,
				flexDirection: 'column',
				backgroundColor: theme.backgroundColor,
				borderWidth: 1,
				borderColor: theme.dividerColor,
				margin: 20,
				padding: 10,
				borderRadius: 5,
			},
			modalContentWrapper2: {
				flex: 1,
			},
			title: Object.assign({}, theme.normalText, {
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
				paddingBottom: 10,
				fontWeight: 'bold',
			}),
			buttonRow: {
				flexDirection: 'row',
				borderTopWidth: 1,
				borderTopColor: theme.dividerColor,
				paddingTop: 10,
			},
		};

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	render() {
		const ContentComponent = this.props.ContentComponent;
		const buttonBarEnabled = this.props.buttonBarEnabled !== false;

		return (
			<View style={this.styles().modalWrapper}>
				<Modal transparent={true} visible={true} onRequestClose={() => {}}>
					<View elevation={10} style={this.styles().modalContentWrapper}>
						<Text style={this.styles().title}>{this.props.title}</Text>
						<View style={this.styles().modalContentWrapper2}>{ContentComponent}</View>
						<View style={this.styles().buttonRow}>
							<View style={{ flex: 1 }}>
								<Button disabled={!buttonBarEnabled} title={_('OK')} onPress={this.props.onOkPress}></Button>
							</View>
							<View style={{ flex: 1, marginLeft: 5 }}>
								<Button disabled={!buttonBarEnabled} title={_('Cancel')} onPress={this.props.onCancelPress}></Button>
							</View>
						</View>
					</View>
				</Modal>
			</View>
		);
	}
}

module.exports = ModalDialog;
