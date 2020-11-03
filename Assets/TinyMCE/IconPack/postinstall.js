const prompts = require('prompts');
const fs = require('fs');

(async function() {
	const response = await prompts({
		type: 'text',
		name: 'iconPackName',
		message: 'Enter the name of the icon pack.',
		validate: function(iconPackName) { return iconPackName.length > 0; },
	});

	try {
		const contents = fs.readFileSync('package.json');
		obj = JSON.parse(contents);
		obj.iconPackName = response.iconPackName;
		fs.writeFileSync('package.json', JSON.stringify(obj, undefined, 2));
	} catch (err) {
		console.error(err.message);
	}
})();
