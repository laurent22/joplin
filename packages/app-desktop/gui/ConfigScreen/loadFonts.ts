import fontList = require('font-list');

fontList.getFonts({ disableQuoting: true })
	.then((fonts: string[]) => process.send(fonts))
	.catch((error: any) => console.error(error));
