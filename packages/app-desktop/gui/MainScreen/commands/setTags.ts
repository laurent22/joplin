import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Tag from '@joplin/lib/models/Tag';
import { TagEntity } from '@joplin/lib/services/database/types';

export const declaration: CommandDeclaration = {
	name: 'setTags',
	label: () => _('Tags'),
	iconName: 'icon-tags',
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			noteIds = noteIds || context.state.selectedNoteIds;

			const tags = await Tag.commonTagsByNoteIds(noteIds);
			const sortedTags = Tag.sortTags(tags);
			const startTags = sortedTags
				.map((a: TagEntity) => {
					return { value: a.id, label: a.title };
				});
			const allTags = await Tag.allWithNotes();
			const sortedAllTags = Tag.sortTags(allTags);
			const tagSuggestions = sortedAllTags
				.map((a: TagEntity) => {
					return { value: a.id, label: a.title };
				});

			comp.setState({
				promptOptions: {
					label: _('Add or remove tags:'),
					inputType: 'tags',
					value: startTags,
					autocomplete: tagSuggestions,
					onClose: async (answer: any[]) => {
						if (answer !== null) {
							const endTagTitles = answer.map(a => {
								return a.label.trim();
							});
							if (noteIds.length === 1) {
								await Tag.setNoteTagsByTitles(noteIds[0], endTagTitles);
							} else {
								const startTagTitles = startTags.map((a: any) => { return a.label.trim(); });
								const addTags = endTagTitles.filter((value: string) => !startTagTitles.includes(value));
								const delTags = startTagTitles.filter((value: string) => !endTagTitles.includes(value));

								// apply the tag additions and deletions to each selected note
								for (let i = 0; i < noteIds.length; i++) {
									const tags = await Tag.tagsByNoteId(noteIds[i]);
									let tagTitles = tags.map((a: any) => { return a.title; });
									tagTitles = tagTitles.concat(addTags);
									tagTitles = tagTitles.filter((value: string) => !delTags.includes(value));
									await Tag.setNoteTagsByTitles(noteIds[i], tagTitles);
								}
							}
						}
						comp.setState({ promptOptions: null });
					},
				},
			});
		},
		enabledCondition: 'someNotesSelected',
	};
};
