import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Tag from '@joplin/lib/models/Tag';
import { TagEntity } from '@joplin/lib/services/database/types';
import { WindowControl } from '../utils/useWindowControl';

export const declaration: CommandDeclaration = {
	name: 'setTags',
	label: () => _('Tags'),
	iconName: 'icon-tags',
};

interface TagOption {
	value: string;
	label: string;
}

export const runtime = (comp: WindowControl): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			noteIds = noteIds || context.state.selectedNoteIds;

			const tags = await Tag.commonTagsByNoteIds(noteIds);
			const startTags: TagOption[] = tags
				.map((a: TagEntity) => {
					return { value: a.id, label: a.title };
				})
				.sort((a, b) => {
					// sensitivity accent will treat accented characters as different
					// but treats caps as equal
					return a.label.localeCompare(b.label, undefined, { sensitivity: 'accent' });
				});
			const allTags = await Tag.allWithNotes();
			const tagSuggestions: TagOption[] = allTags.map((a: TagEntity) => {
				return { value: a.id, label: a.title };
			})
				.sort((a, b) => {
				// sensitivity accent will treat accented characters as different
				// but treats caps as equal
					return a.label.localeCompare(b.label, undefined, { sensitivity: 'accent' });
				});

			comp.setState({
				promptOptions: {
					label: _('Add or remove tags:'),
					inputType: 'tags',
					value: startTags as unknown as string,
					autocomplete: tagSuggestions,
					onClose: async (answer: unknown) => {
						if (answer !== null) {
							const answerTags = answer as TagOption[];
							const endTagTitles = answerTags.map(a => {
								return a.label.trim();
							});
							if (noteIds.length === 1) {
								await Tag.setNoteTagsByTitles(noteIds[0], endTagTitles);
							} else {
								const startTagTitles = startTags.map(a => { return a.label.trim(); });
								const addTags = endTagTitles.filter((value: string) => !startTagTitles.includes(value));
								const delTags = startTagTitles.filter((value: string) => !endTagTitles.includes(value));

								// apply the tag additions and deletions to each selected note
								for (let i = 0; i < noteIds.length; i++) {
									const tags = await Tag.tagsByNoteId(noteIds[i]);
									let tagTitles = tags.map((a: TagEntity) => { return a.title; });
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
		enabledCondition: 'someNotesSelected && !inTrash',
	};
};
