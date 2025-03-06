import { FilterHandler } from '../../../eventManager';
/**
 * @ignore
 *
 * Not sure if it's the best way to hook into the app
 * so for now disable filters.
 */
export default class JoplinFilters {
    on(name: string, callback: FilterHandler): Promise<void>;
    off(name: string, callback: FilterHandler): Promise<void>;
}
