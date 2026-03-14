import JoplinViewsPanels from './JoplinViewsPanels';

describe('JoplinViewsPanels', () => {

	describe('isActive', () => {

		it('should throw an error because isActive is not relevant for panels', async () => {
			// isActive() throws unconditionally for panels — no real Plugin
			// or store is needed since the method never touches them.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const panels = new JoplinViewsPanels(null as any, null as any);

			await expect(panels.isActive('any-handle')).rejects.toThrow(
				'isActive() is not supported for panels. Use visible() to check whether the panel is shown or hidden.',
			);
		});

	});

});
