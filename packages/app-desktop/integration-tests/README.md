# Integration tests

The integration tests in this directory can be run with `yarn test-ui`.

- To run all tests from a specific file, use `yarn test-ui testFileName`. For example, `yarn test-ui wcag` to run the tests in `wcag.ts`.
- To run all tests matching a pattern, use `yarn test-ui -g "pattern here"`, where `-g` is short for "grep".
- Tests use a `test-profile` directory that should be re-created before every test.
- Only one Electron application should be instantiated per test file.
- Files in the `models/` directory follow [the page object model](https://playwright.dev/docs/pom).

# References

The following sources are helpful for designing and implementing Electron integration tests
with Playwright:
- [A setup guide from an organisation that uses Playwright](https://dev.to/kubeshop/testing-electron-apps-with-playwright-3f89)
  and [that organisation's test suite](https://github.com/kubeshop/monokle/blob/main/tests/base.test.ts).
- [The Playwright ElectronApp docs](https://playwright.dev/docs/api/class-electronapplication)
- [Electron Playwright example repository](https://github.com/spaceagetv/electron-playwright-example)
- [Playwright best practices](https://playwright.dev/docs/best-practices)
- [Running and debugging tests from VSCode](https://playwright.dev/docs/getting-started-vscode#running-tests).

# FAQ

## How do I fix timeout-related test failures?

If Playwright tests are timing out, consider modifying `playwright.config.ts` in the `app-desktop` folder. For example, increase the `timeout` option to `120_000` (2 minutes).

Alternatively, try temporarily disabling `fullyParallel` (which disables running tests in parallel).

