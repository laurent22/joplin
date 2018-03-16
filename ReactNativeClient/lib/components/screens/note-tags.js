const React = require('react'); const Component = React.Component;
const { ListView, StyleSheet, View, Text, Button, FlatList, TouchableOpacity, TextInput } = require('react-native');
const Setting = require('lib/models/Setting.js');
const { connect } = require('react-redux');
const { reg } = require('lib/registry.js');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { time } = require('lib/time-utils');
const { Logger } = require('lib/logger.js');
const BaseItem = require('lib/models/BaseItem.js');
const Tag = require('lib/models/Tag.js');
const { Database } = require('lib/database.js');
const Folder = require('lib/models/Folder.js');
const { ReportService } = require('lib/services/report.js');
const { _ } = require('lib/locale.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const { globalStyle, themeStyle } = require('lib/components/global-style.js');
const Icon = require('react-native-vector-icons/Ionicons').default;

const styles = StyleSheet.create({
	body: {
		flex: 1,
		margin: globalStyle.margin,
	},
});

class NoteTagsScreenComponent extends BaseScreenComponent {

	constructor() {
		super();
		this.styles_ = {};
		this.state = {
			noteTagIds: [],
			noteId: null,
			tagListData: [],
			newTags: '',
			savingTags: false,
		};

		const noteHasTag = (tagId) => {
			for (let i = 0; i < this.state.tagListData.length; i++) {
				if (this.state.tagListData[i].id === tagId) return this.state.tagListData[i].selected;
			}
			return false;
		}

		const newTagTitles = () => {
			return this.state.newTags
				.split(',')
				.map(t => t.trim().toLowerCase())
				.filter(t => !!t);
		}

		this.tag_press = (tagId) => {
			const newData = this.state.tagListData.slice();
			for (let i = 0; i < newData.length; i++) {
				const t = newData[i];
				if (t.id === tagId) {
					const newTag = Object.assign({}, t);
					newTag.selected = !newTag.selected;
					newData[i] = newTag;
					break;
				}
			}

			this.setState({ tagListData: newData });
		}

		this.renderTag = (data) => {
			const tag = data.item;
			const iconName = noteHasTag(tag.id) ? 'md-checkbox-outline' : 'md-square-outline';
			return (
				<TouchableOpacity key={tag.id} onPress={() => this.tag_press(tag.id)} style={this.styles().tag}>
					<View style={this.styles().tagIconText}>
						<Icon name={iconName} style={this.styles().tagCheckbox}/><Text>{tag.title}</Text>
					</View>
				</TouchableOpacity>
			);
		}

		this.tagKeyExtractor = (tag, index) => tag.id;

		this.okButton_press = async () => {
			this.setState({ savingTags: true });

			try {
				const tagIds = this.state.tagListData.filter(t => t.selected).map(t => t.id);
				await Tag.setNoteTagsByIds(this.state.noteId, tagIds);

				const extraTitles = newTagTitles();
				for (let i = 0; i < extraTitles.length; i++) {
					await Tag.addNoteTagByTitle(this.state.noteId, extraTitles[i]);
				}
			} finally {
				this.setState({ savingTags: false });
			}

			this.props.dispatch({
				type: 'NAV_BACK',
			});
		}

		this.cancelButton_press = () => {
			this.props.dispatch({
				type: 'NAV_BACK',
			});
		}
	}

	componentWillMount() {
		const noteId = this.props.noteId;
		this.setState({ noteId: noteId });
		this.loadNoteTags(noteId);
	}

	async loadNoteTags(noteId) {
		const tags = await Tag.tagsByNoteId(noteId);
		const tagIds = tags.map(t => t.id);

		const tagListData = this.props.tags.map(tag => { return {
			id: tag.id,
			title: tag.title,
			selected: tagIds.indexOf(tag.id) >= 0,
		}});

		this.setState({ tagListData: tagListData });
	}

	styles() {
		const themeId = this.props.theme;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		let styles = {
			tag: {
				padding: 10,
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
			},
			tagIconText: {
				flexDirection: 'row',
				alignItems: 'center',
			},
			tagCheckbox: {
				marginRight: 5,
				fontSize: 20,
			},
			newTagBox: {
				flexDirection:'row',
				alignItems: 'center',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				borderTopWidth: 1,
				borderTopColor: theme.dividerColor
			},
		};

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}
	
	render() {
		const theme = themeStyle(this.props.theme);

		return (
			<View style={this.rootStyle(this.props.theme).root}>
				<ScreenHeader title={_('Note tags')} showSideMenuButton={false} showSearchButton={false} showContextMenuButton={false}/>
				<FlatList
					data={this.state.tagListData}
					renderItem={this.renderTag}
					keyExtractor={this.tagKeyExtractor}
				/>
				<View style={this.styles().newTagBox}>
					<Text>{_('Or type tags:')}</Text><TextInput value={this.state.newTags} onChangeText={value => { this.setState({ newTags: value }) }} style={{flex:1}}/>
				</View>
				<View style={theme.buttonRow}>
					<View style={{flex:1}}>
						<Button disabled={this.state.savingTags} title={_('OK')} onPress={this.okButton_press}></Button>
					</View>
					<View style={{flex:1, marginLeft: 5}}>
						<Button disabled={this.state.savingTags} title={_('Cancel')} onPress={this.cancelButton_press}></Button>
					</View>
				</View>
			</View>
		);
	}

}

const NoteTagsScreen = connect(
	(state) => {
		return {
			theme: state.settings.theme,
			tags: state.tags,
			noteId: state.selectedNoteIds.length ? state.selectedNoteIds[0] : null,
		};
	}
)(NoteTagsScreenComponent)

module.exports = { NoteTagsScreen };