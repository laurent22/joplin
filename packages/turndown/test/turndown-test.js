const Attendant = require('turndown-attendant');
const TurndownService = require('../lib/turndown.cjs');

const attendant = new Attendant({
	file: `${__dirname}/index.html`,
	TurndownService: TurndownService,
});
const test = attendant.test;

attendant.run();

test('malformed documents', function(t) {
	t.plan(0);
	const turndownService = new TurndownService();
	turndownService.turndown('<HTML><head></head><BODY><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><body onload=alert(document.cookie);></body></html>');
	t.end();
});

test('null input', function(t) {
	t.plan(1);
	const turndownService = new TurndownService();
	t.throws(
		function() { turndownService.turndown(null); }, /null is not a string/
	);
});

test('undefined input', function(t) {
	t.plan(1);
	const turndownService = new TurndownService();
	t.throws(
		function() { turndownService.turndown(void (0)); },
		/undefined is not a string/
	);
});

test('#addRule returns the instance', function(t) {
	t.plan(1);
	const turndownService = new TurndownService();
	const rule = {
		filter: ['del', 's', 'strike'],
		replacement: function(content) {
			return `~~${content}~~`;
		},
	};
	t.equal(turndownService.addRule('strikethrough', rule), turndownService);
});

test('#addRule adds the rule', function(t) {
	t.plan(2);
	const turndownService = new TurndownService();
	const rule = {
		filter: ['del', 's', 'strike'],
		replacement: function(content) {
			return `~~${content}~~`;
		},
	};
	// Assert rules#add is called
	turndownService.rules.add = function(key, r) {
		t.equal(key, 'strikethrough');
		t.equal(rule, r);
	};
	turndownService.addRule('strikethrough', rule);
});

test('#use returns the instance for chaining', function(t) {
	t.plan(1);
	const turndownService = new TurndownService();
	t.equal(turndownService.use(function plugin() {}), turndownService);
});

test('#use with a single plugin calls the fn with instance', function(t) {
	t.plan(1);
	const turndownService = new TurndownService();
	function plugin(service) {
		t.equal(service, turndownService);
	}
	turndownService.use(plugin);
});

test('#use with multiple plugins calls each fn with instance', function(t) {
	t.plan(2);
	const turndownService = new TurndownService();
	function plugin1(service) {
		t.equal(service, turndownService);
	}
	function plugin2(service) {
		t.equal(service, turndownService);
	}
	turndownService.use([plugin1, plugin2]);
});

test('#keep keeps elements as HTML', function(t) {
	t.plan(2);
	const turndownService = new TurndownService();
	const input = '<p>Hello <del>world</del><ins>World</ins></p>';

	// Without `.keep(['del', 'ins'])`
	t.equal(turndownService.turndown(input), 'Hello worldWorld');

	// With `.keep(['del', 'ins'])`
	turndownService.keep(['del', 'ins']);
	t.equal(
		turndownService.turndown('<p>Hello <del>world</del><ins>World</ins></p>'),
		'Hello <del>world</del><ins>World</ins>'
	);
});

test('#keep returns the TurndownService instance for chaining', function(t) {
	t.plan(1);
	const turndownService = new TurndownService();
	t.equal(turndownService.keep(['del', 'ins']), turndownService);
});

test('keep rules are overridden by the standard rules', function(t) {
	t.plan(1);
	const turndownService = new TurndownService();
	turndownService.keep('p');
	t.equal(turndownService.turndown('<p>Hello world</p>'), 'Hello world');
});

test('keepReplacement can be customised', function(t) {
	t.plan(1);
	const turndownService = new TurndownService({
		keepReplacement: function(content, node) {
			return `\n\n${node.outerHTML}\n\n`;
		},
	});
	turndownService.keep(['del', 'ins']);
	t.equal(turndownService.turndown(
		'<p>Hello <del>world</del><ins>World</ins></p>'),
	'Hello \n\n<del>world</del>\n\n<ins>World</ins>'
	);
});

test('#remove removes elements', function(t) {
	t.plan(2);
	const turndownService = new TurndownService();
	const input = '<del>Please redact me</del>';

	// Without `.remove('del')`
	t.equal(turndownService.turndown(input), 'Please redact me');

	// With `.remove('del')`
	turndownService.remove('del');
	t.equal(turndownService.turndown(input), '');
});

test('#remove returns the TurndownService instance for chaining', function(t) {
	t.plan(1);
	const turndownService = new TurndownService();
	t.equal(turndownService.remove(['del', 'ins']), turndownService);
});

test('remove elements are overridden by rules', function(t) {
	t.plan(1);
	const turndownService = new TurndownService();
	turndownService.remove('p');
	t.equal(turndownService.turndown('<p>Hello world</p>'), 'Hello world');
});

test('remove elements are overridden by keep', function(t) {
	t.plan(1);
	const turndownService = new TurndownService();
	turndownService.keep(['del', 'ins']);
	turndownService.remove(['del', 'ins']);
	t.equal(turndownService.turndown(
		'<p>Hello <del>world</del><ins>World</ins></p>'),
	'Hello <del>world</del><ins>World</ins>'
	);
});

test('ordered list items with three digit numbers keep a space after the marker', function(t) {
	t.plan(2);
	const turndownService = new TurndownService();
	const html = `<ol>${Array.from({ length: 100 }, (_, i) => `<li>item ${i + 1}</li>`).join('')}</ol>`;
	const output = turndownService.turndown(html);
	t.ok(output.includes('100. item 100'), 'item 100 is "100. item 100"');
	t.ok(!output.includes('100.item'), 'marker is not glued to the content');
});

test('ordered list items with four digit numbers do not throw and keep a space after the marker', function(t) {
	t.plan(2);
	const turndownService = new TurndownService();
	const html = `<ol>${Array.from({ length: 1000 }, (_, i) => `<li>item ${i + 1}</li>`).join('')}</ol>`;
	const output = turndownService.turndown(html);
	t.ok(output.includes('1000. item 1000'), 'item 1000 is "1000. item 1000"');
	t.ok(output.includes('999. item 999'), 'item 999 keeps its marker');
});

test('ordered list start attribute crossing the three digit boundary', function(t) {
	t.plan(2);
	const turndownService = new TurndownService();
	const output = turndownService.turndown('<ol start="999"><li>first</li><li>second</li></ol>');
	t.ok(output.includes('999. first'), 'first item is "999. first"');
	t.ok(output.includes('1000. second'), 'second item is "1000. second"');
});
