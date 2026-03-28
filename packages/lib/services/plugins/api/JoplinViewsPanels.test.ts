/* eslint-disable-next-line @typescript-eslint/triple-slash-reference */
/// <reference types="jest" />
import JoplinViewsPanels from './JoplinViewsPanels';

describe('JoplinViewsPanels', () => {

	it('isActive() should return true for panels', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const panels = new JoplinViewsPanels(null as any, null as any);

		await expect(panels.isActive('any-handle')).resolves.toBe(true);
	});

});
