class SyncTargetRegistry {
	static classById(syncTargetId) {
		const info = SyncTargetRegistry.reg_[syncTargetId];
		if (!info) throw new Error(`Invalid id: ${syncTargetId}`);
		return info.classRef;
	}

	static addClass(SyncTargetClass) {
		this.reg_[SyncTargetClass.id()] = {
			id: SyncTargetClass.id(),
			name: SyncTargetClass.targetName(),
			label: SyncTargetClass.label(),
			classRef: SyncTargetClass,
			supportsConfigCheck: SyncTargetClass.supportsConfigCheck(),
		};
	}

	static nameToId(name) {
		for (let n in this.reg_) {
			if (!this.reg_.hasOwnProperty(n)) continue;
			if (this.reg_[n].name === name) return this.reg_[n].id;
		}
		throw new Error(`Name not found: ${name}`);
	}

	static idToMetadata(id) {
		for (let n in this.reg_) {
			if (!this.reg_.hasOwnProperty(n)) continue;
			if (this.reg_[n].id === id) return this.reg_[n];
		}
		throw new Error(`ID not found: ${id}`);
	}

	static idToName(id) {
		return this.idToMetadata(id).name;
	}

	static idAndLabelPlainObject(os) {
		let output = {};
		for (let n in this.reg_) {
			if (!this.reg_.hasOwnProperty(n)) continue;
			const info = this.reg_[n];
			if (info.classRef.unsupportedPlatforms().indexOf(os) >= 0) {
				continue;
			}
			output[n] = info.label;
		}
		return output;
	}
}

SyncTargetRegistry.reg_ = {};

module.exports = SyncTargetRegistry;
