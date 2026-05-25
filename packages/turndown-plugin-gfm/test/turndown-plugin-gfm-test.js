
import Attendant from 'turndown-attendant';
import TurndownService from 'turndown';
import { gfm } from '../lib/turndown-plugin-gfm.cjs';
const attendant = new Attendant({
	file: `${__dirname}/index.html`,
	TurndownService: TurndownService,
	beforeEach: function(turndownService) {
		turndownService.use(gfm);
	},
});

attendant.run();
