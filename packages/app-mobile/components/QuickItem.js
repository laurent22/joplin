const React = require('react');
const Component = React.Component;
const { connect } = require('react-redux');
const { Text, TouchableOpacity, View, StyleSheet } = require('react-native');
const { TextInput } = require('react-native-paper');
const { themeStyle } = require('./global-style.js');

class QuickItemComponent extends Component {
	constructor() {
		super();
		this.styles_ = {};
		this.state = {
			text: '',
		};
	}

	styles() {
		const theme = themeStyle(this.props.themeId);

		if (this.styles_[this.props.themeId]) return this.styles_[this.props.themeId];
		this.styles_ = {};

		const styles = {
			listItem: {
				flexDirection: 'row',
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
				justifyContent: 'center',
				alignItems: 'center',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: theme.itemMarginTop,
				paddingBottom: theme.itemMarginBottom,
			},
			listItemText: {
				flex: 1,
				color: theme.color,
				fontSize: theme.fontSize,
			},
			hideButtonStyle: {
				fontSize: theme.fontSize,
				paddingTop: theme.itemMarginTop + 15,
				paddingLeft: 10,
			},
		};

		this.styles_[this.props.themeId] = StyleSheet.create(styles);
		return this.styles_[this.props.themeId];
	}

	render() {
		const listItemStyle = this.styles().listItem;
		const listItemTextStyle = this.styles().listItemText;
		const hideButtonStyle = this.styles().hideButtonStyle;

		return (
			<View style={listItemStyle}>
				{
					<TextInput
						style={listItemTextStyle}
						value={this.state.text}
						onChangeText={(text) => this.setState(
							{
								...this.state,
								text: text,
							}
						)}
						onSubmitEditing={async (_event) => {
							await this.props.onSubmit(this.state.text);
							this.setState({
								...this.state,
								text: '',
							});
						}}
						placeholder={'Untitled'}
						blurOnSubmit={false}
						label={
							this.props.isTodo ?
								'New to-do' : 'New note'
						}
						autoFocus={true}
					/>
				}
				<TouchableOpacity
					onPress={this.props.onHide}
					style={hideButtonStyle}
				>
					<Text>Hide</Text>
				</TouchableOpacity>
			</View>
		);
	}
}

const QuickItem = connect(state => {
	return {
		themeId: state.settings.theme,
	};
})(QuickItemComponent);

module.exports = { QuickItem };
