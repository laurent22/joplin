import joplin from 'api';
import { ItemFlow } from 'api/noteListType';

joplin.plugins.register({
	onStart: async function() {
		await joplin.views.noteList.registerRenderer({
			id: 'simpleTopToBottom',

			label: async () => 'Simple top-to-bottom renderer',

			flow: ItemFlow.TopToBottom,
		
			itemSize: {
				width: 0,
				height: 34,
			},
		
			dependencies: [
				'item.selected',
				'note.titleHtml',
			],

			itemCss: // css
				`
				> .content {
					display: flex;
					align-items: center;
					width: 100%;
					box-sizing: border-box;
					padding-left: 10px;
				}

				> .content.-selected {
					border: 1px solid var(--joplin-color);
				}
				`,
		
			itemTemplate: // html
				`
				<div class="content {{#item.selected}}-selected{{/item.selected}}">
					{{{note.titleHtml}}}
				</div>
			`,
		
			onRenderNote: async (props: any) => {
				return props;
			},
		});

		await joplin.views.noteList.registerRenderer({
			id: 'simpleLeftToRight',

			label: async () => 'Simple left-to-right renderer',

			flow: ItemFlow.LeftToRight,
		
			itemSize: {
				width: 100,
				height: 100,
			},
		
			dependencies: [
				'note.id',
				'item.selected',
				'note.titleHtml',
			],

			itemCss: // css
				`
				> .content {
					display: flex;
					align-items: center;
					width: 100%;
					box-sizing: border-box;
					padding-left: 10px;
				}

				> .content.-selected {
					border: 1px solid var(--joplin-color);
				}
				`,
		
			itemTemplate: // html
				`
				<div class="content {{#item.selected}}-selected{{/item.selected}}">
					{{{note.titleHtml}}}
				</div>
			`,
		
			onRenderNote: async (props: any) => {
				const resources = await joplin.data.get(['notes', props.note.id, 'resources']);
				console.info('RRRRRRRRRRRR', resources);
				if (resources.items.length) {
					const file = await joplin.data.get(['resources', resources.items[0].id, 'file']);
					console.info('FFFFFFFFFFFFFFF', file);
				}
				
				return props;
			},
		});
	},
});
