import { ExportModule, ImportModule } from './types';
export default class JoplinInterop {
    registerExportModule(module: ExportModule): Promise<void>;
    registerImportModule(module: ImportModule): Promise<void>;
}
