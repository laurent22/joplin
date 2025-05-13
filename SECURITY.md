# Security Policy

## Supported Versions

Only the latest version is supported with security updates.

## Reporting a Vulnerability

Please [contact support](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/AdresseSupport.png) **with a proof of concept** that shows the security vulnerability. Please do not contact us without this proof of concept, as we cannot fix anything without this.

For general opinions on what makes an app more or less secure, please use the forum.

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

We **do not** offer a bounty for discovering vulnerabilities, please do not ask. We can however credit you and link to your website in the changelog and release announcement.
