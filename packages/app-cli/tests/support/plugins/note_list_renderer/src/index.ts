import joplin from 'api';
import { ItemFlow } from 'api/noteListType';

joplin.plugins.register({
	onStart: async function() {
		await joplin.views.noteList.registerRenderer({
			label: () => 'Plugin test',

			flow: ItemFlow.TopToBottom,
		
			itemSize: {
				width: 0,
				height: 34,
			},
		
			dependencies: [
				'note.titleHtml',
			],
		
			itemTemplate: // html
				`
				<div>
					xxxx {{{note.titleHtml}}}
				</div>
			`,
		
			onRenderNote: async (props: any) => {
				return props;
			},
		});
	},
});
