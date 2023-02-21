const sandboxProxy = require('@joplin/lib/services/plugins/sandboxProxy');
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';

describe('services_plugins_sandboxProxy', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should create a new sandbox proxy', (async () => {
		interface Result {
			path: string;
			args: any[];
		}

		const results: Result[] = [];

		const target: any = (path: string, args: any[]) => {
			results.push({ path, args });
		};

		const proxy = sandboxProxy(target);

		proxy.testing.bla.test('hello', '123');
		proxy.testing.test2();

		expect(results[0].path).toBe('testing.bla.test');
		expect(results[0].args.join('_')).toBe('hello_123');
		expect(results[1].path).toBe('testing.test2');
		expect(results[1].args.join('_')).toBe('');
	}));

	it('should allow importing a namespace', (async () => {
		interface Result {
			path: string;
			args: any[];
		}

		const results: Result[] = [];

		const target: any = (path: string, args: any[]) => {
			results.push({ path, args });
		};

		const proxy = sandboxProxy(target);

		const ns = proxy.testing.blabla;
		ns.test();
		ns.test2();

		expect(results[0].path).toBe('testing.blabla.test');
		expect(results[1].path).toBe('testing.blabla.test2');
	}));

});
