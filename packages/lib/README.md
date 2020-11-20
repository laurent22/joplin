# @joplin/lib

Library shared between all applications.

- It should not have dependencies to any other `@joplin` package to avoid dependency cycles.
- Binary packages should be passed via dependency injection from the parent packages, for example like it is done in shim-init-node. This is because each app might need to compile the binary package in a specific way, so doing it from /lib would cause issues.
- It should not include the `react` or `react-native` packages because React in particular breaks when there's more than one instance of it in node_modules. React is passed via dependency injections so that some hooks can be shared.