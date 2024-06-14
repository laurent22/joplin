import { ChangeSpec, SelectionRange } from '@codemirror/state';

// Specifies the update of a single selection region and its contents
export type SelectionUpdate = { range: SelectionRange; changes?: ChangeSpec };

