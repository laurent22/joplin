import { ExportModule, ImportModule } from './types';
/**
 * Provides a way to create modules to import external data into Joplin or to export notes into any arbitrary format.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/json_export)
 *
 * To implement an import or export module, you would simply define an object with various event handlers that are called
 * by the application during the import/export process.
 *
 * See the documentation of the [[ExportModule]] and [[ImportModule]] for more information.
 *
 * You may also want to refer to the Joplin API documentation to see the list of properties for each item (note, notebook, etc.) - https://joplinapp.org/api/references/rest_api/
 */
export default class JoplinInterop {
    registerExportModule(module: ExportModule): Promise<void>;
    registerImportModule(module: ImportModule): Promise<void>;
}
