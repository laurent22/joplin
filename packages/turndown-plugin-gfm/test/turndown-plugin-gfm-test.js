const Attendant = require('turndown-attendant');
const TurndownService = require('turndown');
const gfm = require('../lib/turndown-plugin-gfm.cjs').gfm;

const attendant = new Attendant({
	file: `${__dirname}/index.html`,
	TurndownService: TurndownService,
	beforeEach: function(turndownService) {
		turndownService.use(gfm);
	},
});

attendant.run();
