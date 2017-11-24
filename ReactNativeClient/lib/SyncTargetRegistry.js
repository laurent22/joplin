class SyncTargetRegistry {

	static classById(syncTargetId) {
		const info = SyncTargetRegistry.reg_[syncTargetId];
		if (!info) throw new Error('Invalid id: ' + syncTargetId);
		return info.classRef;
	}

	static addClass(SyncTargetClass) {
		this.reg_[SyncTargetClass.id()] = {
			id: SyncTargetClass.id(),
			label: SyncTargetClass.label(),
			classRef: SyncTargetClass,
		};
	}

}

SyncTargetRegistry.reg_ = {};

module.exports = SyncTargetRegistry;