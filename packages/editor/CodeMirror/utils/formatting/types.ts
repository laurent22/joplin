
// Specifies the update of a single selection region and its contents
import { ChangeSpec, SelectionRange } from '@codemirror/state';
export type SelectionUpdate = { range: SelectionRange; changes?: ChangeSpec };

