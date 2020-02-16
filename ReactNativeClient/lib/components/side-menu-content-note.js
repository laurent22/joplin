const React = require('react');
const Component = React.Component;
const { TouchableOpacity, Text, StyleSheet, ScrollView, View } = require('react-native');
const { connect } = require('react-redux');
const Icon = require('react-native-vector-icons/Ionicons').default;
const { globalStyle, themeStyle } = require('lib/components/global-style.js');

Icon.loadFont();

class SideMenuContentNoteComponent extends Component {
	constructor() {
		super();

		this.styles_ = {};
	}

	styles() {
		const theme = themeStyle(this.props.theme);

		if (this.styles_[this.props.theme]) return this.styles_[this.props.theme];
		this.styles_ = {};

		let styles = {
			menu: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
			},
			button: {
				flex: 1,
				flexDirection: 'row',
				height: 36,
				alignItems: 'center',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
			},
			sidebarIcon: {
				fontSize: 22,
				color: theme.color,
			},
			sideButtonText: {
				color: theme.color,
			},
		};

		styles.sideButton = Object.assign({}, styles.button, { flex: 0 });
		styles.sideButtonDisabled = Object.assign({}, styles.sideButton, { opacity: 0.6 });

		this.styles_[this.props.theme] = StyleSheet.create(styles);
		return this.styles_[this.props.theme];
	}

	renderDivider(key) {
		return <View style={{ marginTop: 15, marginBottom: 15, flex: -1, borderBottomWidth: 1, borderBottomColor: globalStyle.dividerColor }} key={key}></View>;
	}

	renderSideBarButton(key, title, iconName, onPressHandler) {
		const content = (
			<View key={key} style={onPressHandler ? this.styles().sideButton : this.styles().sideButtonDisabled}>
				{!iconName ? null : <Icon name={iconName} style={this.styles().sidebarIcon} />}
				<Text style={this.styles().sideButtonText}>{title}</Text>
			</View>
		);

		if (!onPressHandler) return content;

		return (
			<TouchableOpacity key={key} onPress={onPressHandler}>
				{content}
			</TouchableOpacity>
		);
	}

	render() {
		const theme = themeStyle(this.props.theme);

		let items = [];

		const options = this.props.options ? this.props.options : [];
		let dividerIndex = 0;

		for (const option of options) {
			if (option.isDivider) {
				items.push(this.renderDivider(`divider_${dividerIndex++}`));
			} else {
				items.push(this.renderSideBarButton(option.title, option.title, null, option.onPress));
			}
		}

		let style = {
			flex: 1,
			borderRightWidth: 1,
			borderRightColor: globalStyle.dividerColor,
			backgroundColor: theme.backgroundColor,
			paddingTop: 10,
		};

		return (
			<View style={style}>
				<View style={{ flex: 1, opacity: this.props.opacity }}>
					<ScrollView scrollsToTop={false} style={this.styles().menu}>
						{items}
					</ScrollView>
				</View>
			</View>
		);
	}
}

const SideMenuContentNote = connect(state => {
	return {
		theme: state.settings.theme,
	};
})(SideMenuContentNoteComponent);

module.exports = { SideMenuContentNote };
