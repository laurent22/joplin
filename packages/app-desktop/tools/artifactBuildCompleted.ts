import { rename } from 'node:fs/promises';

const artifactBuildCompleted = async (createdEvent: { file: string; safeArtifactName: string|null }) => {

	// Rename ARM64 builds so that older versions of Joplin won't try to download them.
	if (createdEvent.file?.endsWith('-arm64.dmg')) {
		const updateExtension = (originalPath: string) =>
			originalPath.replace(/dmg$/, 'DMG');

		const newFile = updateExtension(createdEvent.file);
		console.log('Renaming ARM64 release from ', createdEvent.file, 'to', newFile);

		await rename(createdEvent.file, newFile);

		createdEvent.file = newFile;
		createdEvent.safeArtifactName = updateExtension(createdEvent.safeArtifactName);
	}
};

export default artifactBuildCompleted;
