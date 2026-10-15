import { renderHook } from '@testing-library/react';
import CommandService from '@joplin/lib/services/CommandService';
import useMessageHandler from './useMessageHandler';
import { FormNote, NoteBodyEditorRef, ScrollOptionTypes } from './types';

const currentNoteId = '0123456789abcdef0123456789abcdef';
const otherNoteId = 'fedcba9876543210fedcba9876543210';

const setup = () => {
	const scrollTo = jest.fn();
	const editorRef = { current: { scrollTo } as Partial<NoteBodyEditorRef> as NoteBodyEditorRef };
	const formNote = { id: currentNoteId } as FormNote;
	const execute = jest.spyOn(CommandService.instance(), 'execute').mockResolvedValue(undefined);
	const { result } = renderHook(() => useMessageHandler(
		{ current: null }, () => {}, 'test-window', editorRef, () => {}, jest.fn(), formNote, null, null,
	));
	return { onMessage: result.current, scrollTo, execute };
};

describe('useMessageHandler', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	test.each([
		`joplin://${currentNoteId}#header-2`,
		`:/${currentNoteId}#header-2`,
	])('should scroll to the heading when a link points to a heading in the current note (%s)', async (link) => {
		const { onMessage, scrollTo, execute } = setup();
		await onMessage({ channel: link, args: [{ resourceId: currentNoteId }] });
		expect(scrollTo).toHaveBeenCalledWith({ type: ScrollOptionTypes.Hash, value: 'header-2' });
		expect(execute).not.toHaveBeenCalled();
	});

	test.each([
		`joplin://${otherNoteId}#header-2`,
		`joplin://${currentNoteId}`,
	])('should open the item when the link is not a heading in the current note (%s)', async (link) => {
		const { onMessage, scrollTo, execute } = setup();
		await onMessage({ channel: link, args: [] });
		expect(execute).toHaveBeenCalledWith('openItem', link);
		expect(scrollTo).not.toHaveBeenCalled();
	});
});
