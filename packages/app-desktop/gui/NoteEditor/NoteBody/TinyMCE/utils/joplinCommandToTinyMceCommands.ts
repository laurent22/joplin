export interface TinyMceCommand {
	name: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	value?: any;
	ui?: boolean;
}

interface JoplinCommandToTinyMceCommands {
	[key: string]: TinyMceCommand | boolean;
}

// If the mapping is simply `true` it means that the command is supported via
// useWindowCommandHandlers.ts. We still add it here to have the complete list
// of supported commands.
export const joplinCommandToTinyMceCommands: JoplinCommandToTinyMceCommands = {
	'textBold': { name: 'mceToggleFormat', value: 'bold' },
	'textItalic': { name: 'mceToggleFormat', value: 'italic' },
	'textCode': { name: 'mceToggleFormat', value: 'code' },
	'textLink': { name: 'mceLink' },
	'textBulletedList': { name: 'InsertUnorderedList' },
	'textNumberedList': { name: 'InsertOrderedList' },
	'search': { name: 'SearchReplace' },
	'attachFile': { name: 'joplinAttach' },
	'insertDateTime': true,
};
