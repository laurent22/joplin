Some URLs in the Rich_Text_Editor contain `_` characters, but haven't been converted to links yet. For example, https://www.example.com/a_test_of_links.

We should preserve the underscores \_without escaping them_ to prevent the links from breaking.

This should also correctly handle unicode characters. For example, punctuation❯\_requires escapes_, but 𝔏𝔈𝔗𝔗𝔈𝕽_𝔠𝔥𝔞𝔯𝔞𝔠𝔱𝔢𝔯𝔰_and_897_numbers_𝒟on_'t.

\_Note_ that what \[\_causes_\] a \`\_\` to create italics_ seems to depend only on the character before and an escape at the \_beginning_ seems to be sufficient.

\_s also don't need escapes if _ followed _ by a \_space.