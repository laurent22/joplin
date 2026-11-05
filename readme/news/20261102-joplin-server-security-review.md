---
forum_url: https://discourse.joplinapp.org/t/51403
---

# A full security review of Joplin Server and Joplin Cloud

October 2026 has been nicknamed "Black October": within weeks, critical vulnerabilities were disclosed in widely used open source software such as PHP, Node.js and GitLab, many of them found with the help of AI and exploited within a day. The same tools that help defenders find bugs now help attackers find them, and Joplin's code is public. The responsible thing to do was to get there first.

## The review

Anthropic gave Joplin access to the Defense Access tier of its Cyber Verification Program, which lets open source maintainers use Claude's full security capabilities on software they maintain. We used it for a complete review of Joplin Server, which also powers Joplin Cloud: every route of the server, and every flow end to end, from signing in to sharing, publishing and email-to-note. Each finding was verified independently, and each fix was reviewed again before release.

No critical issues were found, but there were a number of high and medium severity ones, and many smaller ones. We have fixed more than 50 of them. Joplin Cloud is already updated, and the fixes are now in a new Joplin Server release. If you use Joplin Cloud, there's nothing you need to do.

## What was addressed

Most fixes concern **account security**: signing in, password resets, email changes and two-factor authentication were all tightened. Changing your password now shuts out anyone who had access to your account, and the server no longer reveals which email addresses have an account. Password guessing is now limited per account, without locking out the real owner.

Others concern **sharing and publishing**. The server trusted shared content a little too much, so someone you shared a notebook with could in some cases affect notes outside the share. It now checks that shared content really belongs where it claims, and published pages show only what was meant to be published.

The rest make the server more **robust**, so that oversized requests or specially crafted content can't slow it down for everyone, and improve **LDAP and SAML** sign-in for self-hosted servers.

## If you self-host

Please update to **version 3.7.4** or greater. Note these changes:

- With **LDAP**, an account matching a directory entry is managed by the directory after its first LDAP sign-in, and its local password stops working.
- Sign-up is disabled when **SAML or LDAP** is enabled, and the SAML Audience must match your server's entity ID.
- Email confirmation is only required for sharing when your server can send emails.
- Your reverse proxy must set the `X-Real-IP` header for rate limits to work.

Details are in the changelog and the security advisory. Thanks to Anthropic for making this review possible, and to everyone who reports security issues responsibly.
