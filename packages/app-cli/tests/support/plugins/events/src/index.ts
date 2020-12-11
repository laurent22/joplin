import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		joplin.workspace.onNoteAlarmTrigger(async (event:any) => {
			const note = await joplin.data.get(['notes', event.noteId]);
			console.info('Alarm was triggered for note: ', note);
		});

		joplin.workspace.onSyncStart(async (event:any) => {
			console.info('Sync has started...');
		});

		joplin.workspace.onSyncComplete(async (event:any) => {
			console.info('Sync has completed');
			console.info('With errors:', event.withErrors);
		});
	},
});
