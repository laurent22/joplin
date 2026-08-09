import * as fs from 'fs';
import * as path from 'path';

describe('eventHandlerOverrides', () => {
	let clickHandler: (event: unknown)=> void;

	beforeAll(() => {
		// Mock document.addEventListener
		const originalAddEventListener = document.addEventListener;
		document.addEventListener = jest.fn((event, handler) => {
			if (event === 'click') {
				clickHandler = handler as (event: unknown)=> void;
			}
		}) as unknown as typeof document.addEventListener;

		// Load and execute the script
		const scriptPath = path.join(__dirname, 'eventHandlerOverrides.js');
		const scriptContent = fs.readFileSync(scriptPath, 'utf8');
		// Run in global scope
		eval(scriptContent);

		// Restore original addEventListener
		document.addEventListener = originalAddEventListener;
	});

	it('should register click handler', () => {
		expect(clickHandler).toBeDefined();
	});

	it('should preventDefault for standard elements like buttons or divs', () => {
		const preventDefault = jest.fn();
		const event = {
			target: {
				nodeName: 'DIV',
			},
			preventDefault,
		};

		clickHandler(event);
		expect(preventDefault).toHaveBeenCalled();
	});

	it('should not preventDefault for INPUT or LABEL elements', () => {
		const preventDefault = jest.fn();

		const eventInput = {
			target: {
				nodeName: 'INPUT',
			},
			preventDefault,
		};
		clickHandler(eventInput);
		expect(preventDefault).not.toHaveBeenCalled();

		const eventLabel = {
			target: {
				nodeName: 'LABEL',
			},
			preventDefault,
		};
		clickHandler(eventLabel);
		expect(preventDefault).not.toHaveBeenCalled();
	});

	it('should not preventDefault for elements within TinyMCE container (.tox)', () => {
		const preventDefault = jest.fn();

		const container = document.createElement('div');
		container.className = 'tox';
		const button = document.createElement('button');
		container.appendChild(button);
		document.body.appendChild(container);

		const eventTox = {
			target: button,
			preventDefault,
		};

		clickHandler(eventTox);
		expect(preventDefault).not.toHaveBeenCalled();

		document.body.removeChild(container);
	});
});
