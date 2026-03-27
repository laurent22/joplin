import JoplinViewsPanels from './JoplinViewsPanels';

describe('JoplinViewsPanels', () => {

	describe('isActive', () => {

		it('should return true for panels (deprecated, always returns true)', async () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const panels = new JoplinViewsPanels(null as any, null as any);

			await expect(panels.isActive('any-handle')).resolves.toBe(true);
		});

	});

});
