import joplin from 'api';
import { ItemFlow } from 'api/noteListType';

const thumbnailCache_:Record<string, string> = {};

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
				'note.body',
			],

			itemCss: // css
				`
				> .content {
					display: flex;
					align-items: center;
					justify-content: center;
					width: 100%;
					box-sizing: border-box;
					padding: 10px;
					border: 1px solid var(--joplin-divider-color);

					> .thumbnail {
						display: flex;
						max-width: 80px;
						max-height: 80px;
					}
				}

				> .content.-selected {
					border: 1px solid var(--joplin-color);
				}
				`,
		
			itemTemplate: // html
				`
				<div class="content {{#item.selected}}-selected{{/item.selected}}">
					{{#thumbnailDataUrl}}
						<img class="thumbnail" src="{{thumbnailDataUrl}}"/>
					{{/thumbnailDataUrl}}
					{{^thumbnailDataUrl}}
						{{{note.titleHtml}}}
					{{/thumbnailDataUrl}}
				</div>
			`,
		
			onRenderNote: async (props: any) => {
				const resources = await joplin.data.get(['notes', props.note.id, 'resources']);
				const resource = resources.items.length ? resources.items[0] : null;
				let thumbnailDataUrl = '';

				if (resource) {
					const existingDataUrl = thumbnailCache_[resource.id];
					if (existingDataUrl) {
						thumbnailDataUrl = existingDataUrl;
					} else {
						const file = await joplin.data.get(['resources', resource.id, 'file']);
						const imageHandle = await joplin.imaging.createFromBuffer(file.body);
						const resizedImageHandle =  await joplin.imaging.resize(imageHandle, { width: 80 });
						thumbnailDataUrl = await joplin.imaging.toDataUrl(resizedImageHandle);
						await joplin.imaging.free(imageHandle);
						await joplin.imaging.free(resizedImageHandle);
						thumbnailCache_[resource.id] = thumbnailDataUrl;
					}
				}
				
				return {
					thumbnailDataUrl,
					...props
				};
			},
		});
	},
});
