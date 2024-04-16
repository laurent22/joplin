import * as React from 'react';

import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { connect } from 'react-redux';
import Tag from '@joplin/lib/models/Tag';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '../global-style';
const Icon = require('react-native-vector-icons/Ionicons').default;
import ModalDialog from '../ModalDialog';
import { AppState } from '../../utils/types';
import { TagEntity } from '@joplin/lib/services/database/types';
const naturalCompare = require('string-natural-compare');

interface Props {
	themeId: number;
	noteId: string|null;
	onCloseRequested?: ()=> void;
	tags: TagEntity[];
}

interface TagListRecord {
	id: string;
	title: string;
	selected: boolean;
}

interface State {
	noteTagIds: string[];
	tagListData: TagListRecord[];
	noteId: string|null;
	newTags: string;
	savingTags: boolean;
	tagFilter: string;
}

class NoteTagsDialogComponent extends React.Component<Props, State> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private styles_: any;

	public constructor(props: Props) {
		super(props);
		this.styles_ = {};
		this.state = {
			noteTagIds: [],
			noteId: null,
			tagListData: [],
			newTags: '',
			savingTags: false,
			tagFilter: '',
		};
	}

	private noteHasTag(tagId: string) {
		for (let i = 0; i < this.state.tagListData.length; i++) {
			if (this.state.tagListData[i].id === tagId) return this.state.tagListData[i].selected;
		}
		return false;
	}

	private newTagTitles() {
		return this.state.newTags
			.split(',')
			.map(t => t.trim().toLowerCase())
			.filter(t => !!t);
	}

	private tag_press = (tagId: string) => {
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

	private renderTag = (data: { item: TagListRecord }) => {
		const tag = data.item;
		const iconName = this.noteHasTag(tag.id) ? 'checkbox-outline' : 'square-outline';
		return (
			<TouchableOpacity key={tag.id} onPress={() => this.tag_press(tag.id)} style={this.styles().tag}>
				<View style={this.styles().tagIconText}>
					<Icon name={iconName} style={this.styles().tagCheckbox} />
					<Text style={this.styles().tagText}>{tag.title}</Text>
				</View>
			</TouchableOpacity>
		);
	};

	private tagKeyExtractor = (tag: TagListRecord) => tag.id;

	private okButton_press = async () => {
		this.setState({ savingTags: true });

		try {
			const tagIds = this.state.tagListData.filter(t => t.selected).map(t => t.id);
			await Tag.setNoteTagsByIds(this.state.noteId, tagIds);

			const extraTitles = this.newTagTitles();
			for (let i = 0; i < extraTitles.length; i++) {
				await Tag.addNoteTagByTitle(this.state.noteId, extraTitles[i]);
			}
		} finally {
			this.setState({ savingTags: false });
		}

		if (this.props.onCloseRequested) this.props.onCloseRequested();
	};

	private cancelButton_press = () => {
		if (this.props.onCloseRequested) this.props.onCloseRequested();
	};

	private filterTags(allTags: TagListRecord[]) {
		return allTags.filter((tag) => tag.title.toLowerCase().includes(this.state.tagFilter.toLowerCase()), allTags);
	}

	public override UNSAFE_componentWillMount() {
		const noteId = this.props.noteId;
		this.setState({ noteId: noteId });
		void this.loadNoteTags(noteId);
	}

	private async loadNoteTags(noteId: string) {
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

	private styles() {
		const themeId = this.props.themeId;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		const styles = StyleSheet.create({
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
		});

		this.styles_[themeId] = styles;
		return this.styles_[themeId];
	}

	public override render() {
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

const NoteTagsDialog = connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
		tags: state.tags,
		noteId: state.selectedNoteIds.length ? state.selectedNoteIds[0] : null,
	};
})(NoteTagsDialogComponent);

export default NoteTagsDialog;
