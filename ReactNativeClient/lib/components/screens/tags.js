const React = require('react');

const { View, Text, FlatList, StyleSheet, TouchableOpacity } = require('react-native');
const { connect } = require('react-redux');
const Tag = require('lib/models/Tag.js');
const { themeStyle } = require('lib/components/global-style.js');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { _ } = require('lib/locale.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');

class TagsScreenComponent extends BaseScreenComponent {
	static navigationOptions() {
		return { header: null };
	}

	constructor() {
		super();

		this.state = {
			tags: [],
		};

		this.tagList_renderItem = this.tagList_renderItem.bind(this);
		this.tagList_keyExtractor = this.tagList_keyExtractor.bind(this);
		this.tagItem_press = this.tagItem_press.bind(this);
	}

	styles() {
		if (this.styles_) return this.styles_;

		const theme = themeStyle(this.props.theme);

		this.styles_ = StyleSheet.create({
			listItem: {
				flexDirection: 'row',
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
				alignItems: 'flex-start',
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
		});

		return this.styles_;
	}

	tagItem_press(event) {
		this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			tagId: event.id,
		});
	}

	tagList_renderItem(event) {
		const tag = event.item;
		return (
			<TouchableOpacity
				onPress={() => {
					this.tagItem_press({ id: tag.id });
				}}
			>
				<View style={this.styles().listItem}>
					<Text style={this.styles().listItemText}>{tag.title}</Text>
				</View>
			</TouchableOpacity>
		);
	}

	tagList_keyExtractor(item) {
		return item.id;
	}

	async componentDidMount() {
		const tags = await Tag.allWithNotes();
		tags.sort((a, b) => {
			return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : +1;
		});
		this.setState({ tags: tags });
	}

	render() {
		const theme = themeStyle(this.props.theme);

		const rootStyle = {
			flex: 1,
			backgroundColor: theme.backgroundColor,
		};

		return (
			<View style={rootStyle}>
				<ScreenHeader title={_('Tags')} parentComponent={this} showSearchButton={false} />
				<FlatList style={{ flex: 1 }} data={this.state.tags} renderItem={this.tagList_renderItem} keyExtractor={this.tagList_keyExtractor} />
			</View>
		);
	}
}

const TagsScreen = connect(state => {
	return {
		theme: state.settings.theme,
	};
})(TagsScreenComponent);

module.exports = { TagsScreen };
