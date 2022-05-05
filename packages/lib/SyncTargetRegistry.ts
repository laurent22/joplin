export interface SyncTargetInfo {
	id: number;
	name: string;
	label: string;
	supportsSelfHosted: boolean;
	supportsConfigCheck: boolean;
	supportsRecursiveLinkedNotes: boolean;
	description: string;
	classRef: any;
}

export default class SyncTargetRegistry {

	private static reg_: Record<number, SyncTargetInfo> = {};

	private static get reg() {
		return this.reg_;
	}

	public static classById(syncTargetId: number) {
		const info = SyncTargetRegistry.reg[syncTargetId];
		if (!info) throw new Error(`Invalid id: ${syncTargetId}`);
		return info.classRef;
	}

	public static infoByName(name: string): SyncTargetInfo {
		for (const [, info] of Object.entries(this.reg)) {
			if (info.name === name) return info;
		}
		throw new Error(`Unknown name: ${name}`);
	}

	public static infoById(id: number): SyncTargetInfo {
		return this.infoByName(this.idToName(id));
	}

	public static addClass(SyncTargetClass: any) {
		this.reg[SyncTargetClass.id()] = {
			id: SyncTargetClass.id(),
			name: SyncTargetClass.targetName(),
			label: SyncTargetClass.label(),
			classRef: SyncTargetClass,
			description: SyncTargetClass.description(),
			supportsSelfHosted: SyncTargetClass.supportsSelfHosted(),
			supportsConfigCheck: SyncTargetClass.supportsConfigCheck(),
			supportsRecursiveLinkedNotes: SyncTargetClass.supportsRecursiveLinkedNotes(),
		};
	}

	public static allIds() {
		return Object.keys(this.reg);
	}

	public static nameToId(name: string) {
		for (const n in this.reg) {
			if (!this.reg.hasOwnProperty(n)) continue;
			if (this.reg[n].name === name) return this.reg[n].id;
		}
		throw new Error(`Name not found: ${name}. Was the sync target registered?`);
	}

	public static idToMetadata(id: number) {
		for (const n in this.reg) {
			if (!this.reg.hasOwnProperty(n)) continue;
			if (this.reg[n].id === id) return this.reg[n];
		}
		throw new Error(`ID not found: ${id}`);
	}

	public static idToName(id: number) {
		return this.idToMetadata(id).name;
	}

	public static idAndLabelPlainObject(os: string) {
		const output: Record<string, string> = {};
		for (const n in this.reg) {
			if (!this.reg.hasOwnProperty(n)) continue;
			const info = this.reg[n];
			if (info.classRef.unsupportedPlatforms().indexOf(os) >= 0) {
				continue;
			}
			output[n] = info.label;
		}

		return output;
	}

	public static optionsOrder(): string[] {
		return [
			'0', // None
			'10', // Joplin Cloud
			'7', // Dropbox
			'3', // OneDrive
		];
	}

}
