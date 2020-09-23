const fs = require('fs-extra');
const path = require('path');

function destDir(context:any) {
	return context.destPath;
}

function resourceDir(context:any) {
	return context.destPath + '/resources';
}

joplin.plugins.register({
	onStart: async function() {

		joplin.interop.registerModule({
			type: 'exporter',
			description: 'JSON Export Directory',
			format: 'json',
			target: 'directory',
			instanceFactory: () => {
				return {
					init: async (context:any) => {
						await fs.mkdirp(destDir(context));
						await fs.mkdirp(resourceDir(context));
					},

					processItem: async (context:any, _itemType:number, item:any) => {
						const filePath = destDir(context) + '/' + item.id + '.json';
						const serialized = JSON.stringify(item);
						await fs.writeFile(filePath, serialized, 'utf8');
					},

					processResource: async (context:any, _resource:any, filePath:string) => {
						const destPath = resourceDir(context) + '/' + path.basename(filePath);
						await fs.copy(filePath, destPath);
					},

					close: () => {},
				};
			},
		});

		joplin.interop.registerModule({
			type: 'importer',
			description: 'JSON Export Directory',
			format: 'json',
			sources: ['directory'],
			instanceFactory: () => {
				return {
					exec: async (context:any) => {
						console.info('Not implemented. Importing from:', context);
					},
				};
			},
		});
	},
});
