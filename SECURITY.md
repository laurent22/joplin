# Security Policy

> [!IMPORTANT]
> Before submitting a report, please read the [Rules for reporting](#rules-for-reporting).

## Supported Versions

Only the latest version is supported with security updates.

## Reporting a Vulnerability

Please report vulnerabilities [through private vulnerability reporting](https://github.com/laurent22/joplin/security/advisories/new) **with a proof of concept** that shows the security vulnerability. Please do not contact us without this proof of concept, as we cannot fix anything without this.

For general opinions on what makes an app more or less secure, please use the forum.

## Rules for reporting

Due to the large number of LLM-generated security reports, we have to put a number of rules in place. These reports are often barely reviewed by the person posting them, which makes us waste time on findings that do not hold up.

It appears that a number of "security researchers" are not really that, and are simply trying to score as many CVEs as possible by posting to as many open source projects as possible, to see what sticks.

As a result:

- We only accept up to **2 active reports per person**.

- If you post more, we may block your account and close all your reports.

- **Check your report before submitting it.** In particular, verify that the issue is still present in the latest version, and that you have actually executed the steps your conclusion depends on. If you submit a report that turns out to be bogus, we may permanently block your account.

- **We no longer credit reporters in the changelog.** The bulk of the work is on our side - reviewing the report, reproducing the issue, fixing it, testing it, and releasing a patch. Copying and pasting LLM output is quick.

A report based on an LLM analysis is fine, as long as you have verified it yourself first.

## Areas outside Joplin's Threat Model

Note: we're mostly linking to Chrome's documentation since our reasoning for these exclusions is the same.

### Denial of Service (DoS)

[Reference](https://chromium.googlesource.com/chromium/src.git/+/master/docs/security/faq.md#are-denial-of-service-issues-considered-security-bugs)

### Physically-local attacks

[Reference](https://chromium.googlesource.com/chromium/src.git/+/master/docs/security/faq.md#why-arent-physically_local-attacks-in-chromes-threat-model)

### Compromised/infected machines

[Reference](https://chromium.googlesource.com/chromium/src.git/+/master/docs/security/faq.md#why-arent-compromised_infected-machines-in-chromes-threat-model)

### Is opening a file on the local machine a security vulnerability?

No - users are allowed to link to files on their local computer. This was a feature that was implemented by popular request. There are measures in place to mitigate security risks such as a dialog to confirm whether a file with an unknown file extension should be opened.

### Is DLL sideloading a security vulnerability?

No. This is an Electron issue and not one they will fix: https://github.com/electron/electron/issues/28384

See also [Physically-local attacks](https://chromium.googlesource.com/chromium/src.git/+/master/docs/security/faq.md#why-arent-physically_local-attacks-in-chromes-threat-model)

### Is local data not being encrypted a security vulnerability?

No, but you should use disk encryption. See also [Physically-local attacks](https://chromium.googlesource.com/chromium/src.git/+/master/docs/security/faq.md#why-arent-physically_local-attacks-in-chromes-threat-model)

## Bounty

We **do not** offer a bounty for discovering vulnerabilities, please do not ask.
