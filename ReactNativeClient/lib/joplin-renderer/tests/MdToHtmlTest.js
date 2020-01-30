const { asyncTest } = require('./test-utils');
const MdToHtml = require('../MdToHtml');

describe('MdToHtml', function() {

	beforeEach(async (done) => {
		done();
	});

	it('should convert Markdown to HTML', asyncTest(async () => {
		const mdToHtml = new MdToHtml({
			ResourceModel: null,
		});

		const md = 'Testing: **Testing**';

		const html = mdToHtml.render(md);

		console.info(html);

		// ![test.jpg](:/b08c25f72bea437ebef5f6470944c3b9)
	}));

});
