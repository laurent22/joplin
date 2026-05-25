import prompts from 'prompts';
import { readFileSync, writeFileSync } from 'fs';

(async function() {
	const response = await prompts({
		type: 'text',
		name: 'iconPackName',
		message: 'Enter the name of the icon pack.',
		validate: function(iconPackName) { return iconPackName.length > 0; },
	});

	try {
		const contents = readFileSync('package.json');
		obj = JSON.parse(contents);
		obj.iconPackName = response.iconPackName;
		writeFileSync('package.json', JSON.stringify(obj, undefined, 2));
	} catch (err) {
		console.error(err.message);
	}
})();
