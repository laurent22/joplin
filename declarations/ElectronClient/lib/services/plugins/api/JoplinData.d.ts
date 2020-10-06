/**
 * This module provides access to the Joplin data API: https://joplinapp.org/api/
 * This is the main way to retrieve data, such as notes, notebooks, tags, etc.
 * or to update them or delete them.
 */
export default class JoplinData {
    private api_;
    private serializeApiBody;
    get(path: string, query?: any): Promise<any>;
    post(path: string, query?: any, body?: any, files?: any[]): Promise<any>;
    put(path: string, query?: any, body?: any, files?: any[]): Promise<any>;
    delete(path: string, query?: any): Promise<any>;
}
