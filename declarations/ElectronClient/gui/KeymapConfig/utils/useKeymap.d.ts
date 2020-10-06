import { KeymapItem } from '../../../lib/services/KeymapService';
declare const useKeymap: () => [KeymapItem[], Error, (keymapItems: KeymapItem[]) => void, (commandName: string, accelerator: string) => void, (commandName: string) => void];
export default useKeymap;
