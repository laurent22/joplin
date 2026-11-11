import { SyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';

// Memoized because mapStateToProps runs on every dispatch and SyncInfo parses the cached JSON.
let cache: { syncInfoCache: string; value: boolean } = null;

export default (syncInfoCache: string) => {
	if (!cache || cache.syncInfoCache !== syncInfoCache) {
		cache = { syncInfoCache, value: !!new SyncInfo(syncInfoCache).noteLockKey };
	}
	return cache.value;
};
