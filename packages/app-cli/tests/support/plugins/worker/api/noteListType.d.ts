import { Size } from './types';
type ListRendererDatabaseDependency = 'folder.created_time' | 'folder.deleted_time' | 'folder.encryption_applied' | 'folder.encryption_cipher_text' | 'folder.icon' | 'folder.id' | 'folder.is_shared' | 'folder.master_key_id' | 'folder.parent_id' | 'folder.share_id' | 'folder.title' | 'folder.updated_time' | 'folder.user_created_time' | 'folder.user_data' | 'folder.user_updated_time' | 'folder.type_' | 'note.altitude' | 'note.application_data' | 'note.author' | 'note.body' | 'note.conflict_original_id' | 'note.created_time' | 'note.deleted_time' | 'note.encryption_applied' | 'note.encryption_cipher_text' | 'note.id' | 'note.is_conflict' | 'note.is_shared' | 'note.is_todo' | 'note.latitude' | 'note.longitude' | 'note.markup_language' | 'note.master_key_id' | 'note.order' | 'note.parent_id' | 'note.share_id' | 'note.source' | 'note.source_application' | 'note.source_url' | 'note.title' | 'note.todo_completed' | 'note.todo_due' | 'note.updated_time' | 'note.user_created_time' | 'note.user_data' | 'note.user_updated_time' | 'note.type_';
export declare enum ItemFlow {
    TopToBottom = "topToBottom",
    LeftToRight = "leftToRight"
}
export type RenderNoteView = Record<string, any>;
export interface OnChangeEvent {
    elementId: string;
    value: any;
    noteId: string;
}
export interface OnClickEvent {
    elementId: string;
}
export type OnRenderNoteHandler = (props: any) => Promise<RenderNoteView>;
export type OnChangeHandler = (event: OnChangeEvent) => Promise<void>;
export type OnClickHandler = (event: OnClickEvent) => Promise<void>;
/**
 * Most of these are the built-in note properties, such as `note.title`, `note.todo_completed`, etc.
 * complemented with special properties such as `note.isWatched`, to know if a note is currently
 * opened in the external editor, and `note.tags` to get the list tags associated with the note.
 *
 * The `note.todoStatusText` property is a localised description of the to-do status (e.g.
 * "to-do, incomplete"). If you include an `<input type='checkbox' ... />` for to-do items that would
 * otherwise be unlabelled, consider adding `note.todoStatusText` as the checkbox's `aria-label`.
 *
 * ## Item properties
 *
 * The `item.*` properties are specific to the rendered item. The most important being
 * `item.selected`, which you can use to display the selected note in a different way.
 */
export type ListRendererDependency = ListRendererDatabaseDependency | 'item.index' | 'item.selected' | 'item.size.height' | 'item.size.width' | 'note.folder.title' | 'note.isWatched' | 'note.tags' | 'note.todoStatusText' | 'note.titleHtml';
export type ListRendererItemValueTemplates = Record<string, string>;
export declare const columnNames: readonly ["note.folder.title", "note.is_todo", "note.latitude", "note.longitude", "note.source_url", "note.tags", "note.title", "note.todo_completed", "note.todo_due", "note.user_created_time", "note.user_updated_time"];
export type ColumnName = typeof columnNames[number];
export interface ListRenderer {
    /**
     * It must be unique to your plugin.
     */
    id: string;
    /**
     * Can be top to bottom or left to right. Left to right gives you more
     * option to set the size of the items since you set both its width and
     * height.
     */
    flow: ItemFlow;
    /**
     * Whether the renderer supports multiple columns. Applies only when `flow`
     * is `topToBottom`. Defaults to `false`.
     */
    multiColumns?: boolean;
    /**
     * The size of each item must be specified in advance for performance
     * reasons, and cannot be changed afterwards. If the item flow is top to
     * bottom, you only need to specify the item height (the width will be
     * ignored).
     */
    itemSize: Size;
    /**
     * The CSS is relative to the list item container. What will appear in the
     * page is essentially `.note-list-item { YOUR_CSS; }`. It means you can use
     * child combinator with guarantee it will only apply to your own items. In
     * this example, the styling will apply to `.note-list-item > .content`:
     *
     * ```css
     * > .content {
     *     padding: 10px;
     * }
     * ```
     *
     * In order to get syntax highlighting working here, it's recommended
     * installing an editor extension such as [es6-string-html VSCode
     * extension](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)
     */
    itemCss?: string;
    /**
     * List the dependencies that your plugin needs to render the note list
     * items. Only these will be passed to your `onRenderNote` handler. Ensure
     * that you do not add more than what you need since there is a performance
     * penalty for each property.
     */
    dependencies?: ListRendererDependency[];
    headerTemplate?: string;
    headerHeight?: number;
    onHeaderClick?: OnClickHandler;
    /**
     * This property is set differently depending on the `multiColumns` property.
     *
     * ## If `multiColumns` is `false`
     *
     * There is only one column and the template is used to render the entire row.
     *
     * This is the HTML template that will be used to render the note list item. This is a [Mustache
     * template](https://github.com/janl/mustache.js) and it will receive the variable you return
     * from `onRenderNote` as tags. For example, if you return a property named `formattedDate` from
     * `onRenderNote`, you can insert it in the template using `Created date: {{formattedDate}}`
     *
     * ## If `multiColumns` is `true`
     *
     * Since there is multiple columns, this template will be used to render each note property
     * within the row. For example if the current columns are the Updated and Title properties, this
     * template will be called once to render the updated time and a second time to render the
     * title. To display the current property, the generic `value` property is provided - it will be
     * replaced at runtime by the actual note property. To render something different depending on
     * the note property, use `itemValueTemplate`. A minimal example would be
     * `<span>{{value}}</span>` which will simply render the current property inside a span tag.
     *
     * In order to get syntax highlighting working here, it's recommended installing an editor
     * extension such as [es6-string-html VSCode
     * extension](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)
     *
     * ## Default property rendering
     *
     * Certain properties are automatically rendered once inserted in the Mustache template. Those
     * are in particular all the date-related fields, such as `note.user_updated_time` or
     * `note.todo_completed`. Internally, those are timestamps in milliseconds, however when
     * rendered we display them as date/time strings using the user's preferred time format. Another
     * notable auto-rendered property is `note.title` which is going to include additional HTML,
     * such as the search markers.
     *
     * If you do not want this default rendering behaviour, for example if you want to display the
     * raw timestamps in milliseconds, you can simply return custom properties from
     * `onRenderNote()`. For example:
     *
     * ```typescript
     * onRenderNote: async (props: any) => {
     *     return {
     *         ...props,
     *         // Return the property under a different name
     *         updatedTimeMs: props.note.user_updated_time,
     *     }
     * },
     *
     * itemTemplate: // html
     *     `
     *     <div>
     *         Raw timestamp: {{updatedTimeMs}} <!-- This is **not** auto-rendered ->
     *         Formatted time: {{note.user_updated_time}} <!-- This is -->
     *     </div>
     * `,
     *
     * ```
     *
     * See
     * `[https://github.com/laurent22/joplin/blob/dev/packages/lib/services/noteList/renderViewProps.ts](renderViewProps.ts)`
     * for the list of properties that have a default rendering.
     */
    itemTemplate: string;
    /**
     * This property applies only when `multiColumns` is `true`. It is used to render something
     * different for each note property.
     *
     * This is a map of actual dependencies to templates - you only need to return something if the
     * default, as specified in `template`, is not enough.
     *
     * Again you need to return a Mustache template and it will be combined with the `template`
     * property to create the final template. For example if you return a property named
     * `formattedDate` from `onRenderNote`, you can insert it in the template using
     * `{{formattedDate}}`. This string will replace `{{value}}` in the `template` property.
     *
     * So if the template property is set to `<span>{{value}}</span>`, the final template will be
     * `<span>{{formattedDate}}</span>`.
     *
     * The property would be set as so:
     *
     * ```javascript
     * itemValueTemplates: {
     *     'note.user_updated_time': '{{formattedDate}}',
     * }
     * ```
     */
    itemValueTemplates?: ListRendererItemValueTemplates;
    /**
     * This user-facing text is used for example in the View menu, so that your
     * renderer can be selected.
     */
    label: () => Promise<string>;
    /**
     * This is where most of the real-time processing will happen. When a note
     * is rendered for the first time and every time it changes, this handler
     * receives the properties specified in the `dependencies` property. You can
     * then process them, load any additional data you need, and once done you
     * need to return the properties that are needed in the `itemTemplate` HTML.
     * Again, to use the formatted date example, you could have such a renderer:
     *
     * ```typescript
     * dependencies: [
     *     'note.title',
     *     'note.created_time',
     * ],
     *
     * itemTemplate: // html
     *     `
     *     <div>
     *         Title: {{note.title}}<br/>
     *         Date: {{formattedDate}}
     *     </div>
     * `,
     *
     * onRenderNote: async (props: any) => {
     *     const formattedDate = dayjs(props.note.created_time).format();
     *     return {
     *         // Also return the props, so that note.title is available from the
     *         // template
     *         ...props,
     *         formattedDate,
     *     }
     * },
     * ```
     */
    onRenderNote: OnRenderNoteHandler;
    /**
     * This handler allows adding some interactivity to the note renderer - whenever an input element
     * within the item is changed (for example, when a checkbox is clicked, or a text input is
     * changed), this `onChange` handler is going to be called.
     *
     * You can inspect `event.elementId` to know which element had some changes, and `event.value`
     * to know the new value. `event.noteId` also tells you what note is affected, so that you can
     * potentially apply changes to it.
     *
     * You specify the element ID, by setting a `data-id` attribute on the input.
     *
     * For example, if you have such a template:
     *
     * ```html
     * <div>
     *     <input type="text" value="{{note.title}}" data-id="noteTitleInput"/>
     * </div>
     * ```
     *
     * The event handler will receive an event with `elementId` set to `noteTitleInput`.
     *
     * ## Default event handlers
     *
     * Currently one click event is automatically handled:
     *
     * If there is a checkbox with a `data-id="todo-checkbox"` attribute is present, it is going to
     * automatically toggle the note to-do "completed" status.
     *
     * For example this is what is used in the default list renderer:
     *
     * `<input data-id="todo-checkbox" type="checkbox" {{#note.todo_completed}}checked="checked"{{/note.todo_completed}}>`
     */
    onChange?: OnChangeHandler;
}
export interface NoteListColumn {
    name: ColumnName;
    width: number;
}
export type NoteListColumns = NoteListColumn[];
export declare const defaultWidth = 100;
export declare const defaultListColumns: () => NoteListColumns;
export {};
