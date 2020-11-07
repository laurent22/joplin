import sandboxProxy, { Target } from '@joplin/lib/services/plugins/sandboxProxy';

const { asyncTest, setupDatabaseAndSynchronizer, switchClient } = require('../../test-utils.js');

describe('services_plugins_sandboxProxy', function() {

	beforeEach(async (done:Function) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should create a new sandbox proxy', asyncTest(async () => {
		interface Result {
			path: string,
			args: any[],
		}

		const results:Result[] = [];

		const target:Target = (path:string, args:any[]) => {
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

	it('should allow importing a namespace', asyncTest(async () => {
		interface Result {
			path: string,
			args: any[],
		}

		const results:Result[] = [];

		const target:Target = (path:string, args:any[]) => {
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
