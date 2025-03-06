import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Tag from '@joplin/lib/models/Tag';

export const declaration: CommandDeclaration = {
	name: 'setTags',
	label: () => _('Tags'),
	iconName: 'icon-tags',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			noteIds = noteIds || context.state.selectedNoteIds;

			const tags = await Tag.commonTagsByNoteIds(noteIds);
			const startTags = tags
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				.map((a: any) => {
					return { value: a.id, label: a.title };
				})
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				.sort((a: any, b: any) => {
					// sensitivity accent will treat accented characters as different
					// but treats caps as equal
					return a.label.localeCompare(b.label, undefined, { sensitivity: 'accent' });
				});
			const allTags = await Tag.allWithNotes();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const tagSuggestions = allTags.map((a: any) => {
				return { value: a.id, label: a.title };
			})
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				.sort((a: any, b: any) => {
				// sensitivity accent will treat accented characters as different
				// but treats caps as equal
					return a.label.localeCompare(b.label, undefined, { sensitivity: 'accent' });
				});

			comp.setState({
				promptOptions: {
					label: _('Add or remove tags:'),
					inputType: 'tags',
					value: startTags,
					autocomplete: tagSuggestions,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					onClose: async (answer: any[]) => {
						if (answer !== null) {
							const endTagTitles = answer.map(a => {
								return a.label.trim();
							});
							if (noteIds.length === 1) {
								await Tag.setNoteTagsByTitles(noteIds[0], endTagTitles);
							} else {
								// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
								const startTagTitles = startTags.map((a: any) => { return a.label.trim(); });
								const addTags = endTagTitles.filter((value: string) => !startTagTitles.includes(value));
								const delTags = startTagTitles.filter((value: string) => !endTagTitles.includes(value));

								// apply the tag additions and deletions to each selected note
								for (let i = 0; i < noteIds.length; i++) {
									const tags = await Tag.tagsByNoteId(noteIds[i]);
									// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
		enabledCondition: 'someNotesSelected && !inTrash',
	};
};
