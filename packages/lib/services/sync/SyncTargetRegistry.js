"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SyncTargetRegistry {
    static get reg() {
        return this.reg_;
    }
    static classById(syncTargetId) {
        const info = SyncTargetRegistry.reg[syncTargetId];
        if (!info)
            throw new Error(`Invalid id: ${syncTargetId}`);
        return info;
    }
    static infoByName(name) {
        for (const [, SyncTargetClass] of Object.entries(this.reg)) {
            if (SyncTargetClass.targetName() === name) {
                const output = {
                    id: SyncTargetClass.id(),
                    name: SyncTargetClass.targetName(),
                    label: SyncTargetClass.label(),
                    classRef: SyncTargetClass,
                    description: SyncTargetClass.description(),
                    supportsSelfHosted: SyncTargetClass.supportsSelfHosted(),
                    supportsConfigCheck: SyncTargetClass.supportsConfigCheck(),
                    supportsRecursiveLinkedNotes: SyncTargetClass.supportsRecursiveLinkedNotes(),
                    supportsShare: SyncTargetClass.supportsShare(),
                };
                return output;
            }
        }
        throw new Error(`Unknown name: ${name}`);
    }
    static infoById(id) {
        return this.infoByName(this.idToName(id));
    }
    static addClass(SyncTargetClass) {
        this.reg[SyncTargetClass.id()] = SyncTargetClass;
    }
    static allIds() {
        return Object.keys(this.reg).map(key => Number(key));
    }
    static nameToId(name) {
        for (const n in this.reg) {
            if (!this.reg.hasOwnProperty(n))
                continue;
            if (this.reg[n].targetName() === name)
                return this.reg[n].id();
        }
        throw new Error(`Name not found: ${name}. Was the sync target registered?`);
    }
    static idToMetadata(id) {
        return this.infoById(id);
    }
    static idToName(id) {
        return this.reg[id].targetName();
    }
    static idAndLabelPlainObject(os) {
        const output = {};
        for (const n in this.reg) {
            if (!this.reg.hasOwnProperty(n))
                continue;
            const info = this.infoById(this.reg[n].id());
            if (info.classRef.unsupportedPlatforms().indexOf(os) >= 0) {
                continue;
            }
            output[n] = info.label;
        }
        return output;
    }
    static optionsOrder() {
        return [
            '0', // None
            '10', // Joplin Cloud
            '7', // Dropbox
            '3', // OneDrive
        ];
    }
    static isJoplinServerOrCloud(id) {
        return [
            SyncTargetRegistry.nameToId('joplinServer'),
            SyncTargetRegistry.nameToId('joplinCloud'),
            SyncTargetRegistry.nameToId('joplinServerSaml'),
        ].includes(id);
    }
}
SyncTargetRegistry.reg_ = {};
exports.default = SyncTargetRegistry;
