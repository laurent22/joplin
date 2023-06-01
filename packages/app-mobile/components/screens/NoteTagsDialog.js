const React = require('react');

const { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput } = require('react-native');
const { connect } = require('react-redux');
const Tag = require('@joplin/lib/models/Tag').default;
const { _ } = require('@joplin/lib/locale');
const { themeStyle } = require('../global-style.js');
const Icon = require('react-native-vector-icons/Ionicons').default;
const ModalDialog = require('../ModalDialog');
const naturalCompare = require('string-natural-compare');

// We need this to suppress the useless warning
// https://github.com/oblador/react-native-vector-icons/issues/1465
// eslint-disable-next-line no-console
Icon.loadFont().catch((error) => { console.info(error); });

class NoteTagsDialogComponent extends React.Component {
	constructor() {
		super();
		this.styles_ = {};
		this.state = {
			noteTagIds: [],
			noteId: null,
			tagListData: [],
			newTags: '',
			savingTags: false,
			tagFilter: '',
		};

		const noteHasTag = tagId => {
			for (let i = 0; i < this.state.tagListData.length; i++) {
				if (this.state.tagListData[i].id === tagId) return this.state.tagListData[i].selected;
			}
			return false;
		};

		const newTagTitles = () => {
			return this.state.newTags
				.split(',')
				.map(t => t.trim().toLowerCase())
				.filter(t => !!t);
		};

		this.tag_press = tagId => {
			const newData = this.state.tagListData.slice();
			for (let i = 0; i < newData.length; i++) {
				const t = newData[i];
				if (t.id === tagId) {
					const newTag = { ...t };
					newTag.selected = !newTag.selected;
					newData[i] = newTag;
					break;
				}
			}

			this.setState({ tagListData: newData });
		};

		this.renderTag = data => {
			const tag = data.item;
			const iconName = noteHasTag(tag.id) ? 'md-checkbox-outline' : 'md-square-outline';
			return (
				<TouchableOpacity key={tag.id} onPress={() => this.tag_press(tag.id)} style={this.styles().tag}>
					<View style={this.styles().tagIconText}>
						<Icon name={iconName} style={this.styles().tagCheckbox} />
						<Text style={this.styles().tagText}>{tag.title}</Text>
					</View>
				</TouchableOpacity>
			);
		};

		this.tagKeyExtractor = (tag) => tag.id;

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

			if (this.props.onCloseRequested) this.props.onCloseRequested();
		};

		this.cancelButton_press = () => {
			if (this.props.onCloseRequested) this.props.onCloseRequested();
		};

		this.filterTags = (allTags) => {
			return allTags.filter((tag) => tag.title.toLowerCase().includes(this.state.tagFilter.toLowerCase()), allTags);
		};
	}

	UNSAFE_componentWillMount() {
		const noteId = this.props.noteId;
		this.setState({ noteId: noteId });
		this.loadNoteTags(noteId);
	}

	async loadNoteTags(noteId) {
		const tags = await Tag.tagsByNoteId(noteId);
		const tagIds = tags.map(t => t.id);

		const tagListData = this.props.tags.map(tag => {
			return {
				id: tag.id,
				title: tag.title,
				selected: tagIds.indexOf(tag.id) >= 0,
			};
		});

		tagListData.sort((a, b) => {
			if (a.selected === b.selected) return naturalCompare(a.title, b.title, { caseInsensitive: true });
			else if (b.selected === true) return 1;
			else return -1;
		});

		this.setState({ tagListData: tagListData });
	}

	styles() {
		const themeId = this.props.themeId;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		const styles = {
			tag: {
				padding: 10,
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
			},
			tagIconText: {
				flexDirection: 'row',
				alignItems: 'center',
			},
			tagText: { ...theme.normalText },
			tagCheckbox: {
				marginRight: 8,
				fontSize: 20,
				color: theme.color,
			},
			tagBox: {
				flexDirection: 'row',
				alignItems: 'center',
				paddingLeft: 10,
				paddingRight: 10,
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
			},
			newTagBoxLabel: { ...theme.normalText, marginRight: 8 },
			tagBoxInput: { ...theme.lineInput, flex: 1 },
		};

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	render() {
		const theme = themeStyle(this.props.themeId);

		const dialogContent = (
			<View style={{ flex: 1 }}>
				<View style={this.styles().tagBox}>
					<Text style={this.styles().newTagBoxLabel}>{_('New tags:')}</Text>
					<TextInput
						selectionColor={theme.textSelectionColor}
						keyboardAppearance={theme.keyboardAppearance}
						value={this.state.newTags}
						onChangeText={value => {
							this.setState({ newTags: value });
						}}
						style={this.styles().tagBoxInput}
						placeholder={_('tag1, tag2, ...')}
					/>
				</View>
				<View style={this.styles().tagBox}>
					<TextInput
						selectionColor={theme.textSelectionColor}
						keyboardAppearance={theme.keyboardAppearance}
						value={this.state.tagFilter}
						onChangeText={value => {
							this.setState({ tagFilter: value });
						}}
						placeholder={_('Filter tags')}
						style={this.styles().tagBoxInput}
					/>
				</View>
				<FlatList data={this.filterTags(this.state.tagListData)} renderItem={this.renderTag} keyExtractor={this.tagKeyExtractor} />
			</View>
		);

		return <ModalDialog themeId={this.props.themeId} ContentComponent={dialogContent} title={_('Type new tags or select from list')} onOkPress={this.okButton_press} onCancelPress={this.cancelButton_press} buttonBarEnabled={!this.state.savingTags} />;
	}
}

const NoteTagsDialog = connect(state => {
	return {
		themeId: state.settings.theme,
		tags: state.tags,
		noteId: state.selectedNoteIds.length ? state.selectedNoteIds[0] : null,
	};
})(NoteTagsDialogComponent);

module.exports = NoteTagsDialog;
