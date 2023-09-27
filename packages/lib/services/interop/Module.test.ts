import InteropService_Exporter_Base from './InteropService_Exporter_Base';
import InteropService_Importer_Base from './InteropService_Importer_Base';
import { makeExportModule, makeImportModule } from './Module';
import { FileSystemItem } from './types';

describe('Module', () => {
	it('should return correct default fullLabel for an ImportModule', () => {
		const baseMetadata = {
			format: 'Foo_test',
			description: 'Some description here',
			sources: [FileSystemItem.File, FileSystemItem.Directory],
		};

		const importModuleMultiSource = makeImportModule(
			baseMetadata,
			() => new InteropService_Importer_Base(),
		);

		const importModuleSingleSource = makeImportModule({
			...baseMetadata,
			sources: [FileSystemItem.File],
		}, () => new InteropService_Importer_Base());

		// The two modules should have the same data, except for their sources.
		expect(importModuleMultiSource.format).toBe('Foo_test');
		expect(importModuleSingleSource.format).toBe(importModuleMultiSource.format);
		expect(importModuleMultiSource.sources).toHaveLength(2);
		expect(importModuleSingleSource.sources).toHaveLength(1);

		const baseLabel = 'FOO - Some description here';
		expect(importModuleMultiSource.fullLabel()).toBe(baseLabel);
		expect(importModuleSingleSource.fullLabel()).toBe(baseLabel);

		// Should only include (File) if the import module has more than one source
		expect(importModuleMultiSource.fullLabel(FileSystemItem.File)).toBe(`${baseLabel} (File)`);
		expect(importModuleSingleSource.fullLabel(FileSystemItem.File)).toBe(baseLabel);
	});

	it('should return correct default fullLabel for an ExportModule', () => {
		const testExportModule = makeExportModule({
			format: 'format_test_______TEST',
			description: 'Testing...',
		}, () => new InteropService_Exporter_Base());

		// Should only include the portion of format before the first underscore
		const label = 'FORMAT - Testing...';
		expect(testExportModule.fullLabel()).toBe(label);

		// Sources should only be shown for import modules
		expect(testExportModule.fullLabel(FileSystemItem.File)).toBe(label);
		expect(testExportModule.fullLabel(FileSystemItem.Directory)).toBe(label);
	});
});
