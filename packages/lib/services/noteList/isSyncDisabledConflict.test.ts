import isSyncDisabledConflict from './isSyncDisabledConflict';

describe('isSyncDisabledConflict', () => {
	it.each([
		['normal note', { is_conflict: 0 }, false],
		['syncable conflict', { is_conflict: 1, conflict_original_id: 'original', is_shared: 0 }, false],
		['conflict without an original', { is_conflict: 1, conflict_original_id: '', is_shared: 0 }, true],
		['shared conflict', { is_conflict: 1, conflict_original_id: 'original', is_shared: 1 }, true],
	])('should identify a %s', (_description, note, expected) => {
		expect(isSyncDisabledConflict(note)).toBe(expected);
	});
});
