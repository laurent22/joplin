import isSyncDisabledConflict from './isSyncDisabledConflict';

describe('isSyncDisabledConflict', () => {
	it.each([
		['normal note', { is_conflict: 0 }, false],
		['syncable conflict', { is_conflict: 1, conflict_original_id: 'original', share_id: '' }, false],
		['conflict without an original', { is_conflict: 1, conflict_original_id: '', share_id: '' }, true],
		['shared conflict', { is_conflict: 1, conflict_original_id: 'original', share_id: 'share' }, true],
	])('should identify a %s', (_description, note, expected) => {
		expect(isSyncDisabledConflict(note)).toBe(expected);
	});
});
