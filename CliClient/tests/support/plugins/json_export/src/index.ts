joplin.plugins.register({
	onStart: async function() {
		joplin.interop.registerModule({
			type: 'exporter',
			description: 'Test JSON Module',
			format: 'json',
			fileExtensions: ['json'],
			instanceFactory: () => {
				return {
					init: async (context:any) => {
						console.info('INIT', context);
						//result.destPath = context.destPath;
					},

					processItem: async (context:any, itemType:number, item:any) => {
						console.info('processItem', itemType, item);
					},

					processResource: async (context:any, resource:any, filePath:string) => {
						console.info('processResource', resource, filePath);
					},

					close: () => {
						console.info('CLOSE');
					},
				};
			},
		});
	},
});
