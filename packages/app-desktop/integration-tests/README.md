# Integration tests

The integration tests in this directory can be run with `yarn playwright test`.

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
