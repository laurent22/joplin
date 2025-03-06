import * as React from 'react';
import { useCallback } from 'react';
import CommandService from '@joplin/lib/services/CommandService';

export default () => {
	return useCallback((event: React.MouseEvent<HTMLDivElement>) => {
		const noteId = event.currentTarget.getAttribute('data-id');
		void CommandService.instance().execute('openNoteInNewWindow', noteId);
	}, []);
};
