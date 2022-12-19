# plugin-repo-cli

This tool is used to build the plugin repository at https://github.com/joplin/plugins

## Testing

To test the tool with existing packages, the best is to:

- Create a separate copy of the plugin repo
- Reset back a few commits
- Run with the --dry-run option: `plugin-repo-cli build ~/src/joplin-plugins-test/ --dry-run`

## Publishing

To publish it, run `npm run publishAll` from the root.