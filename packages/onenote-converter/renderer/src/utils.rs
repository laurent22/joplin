use itertools::Itertools;
use parser_utils::errors::Result;
use percent_encoding::{AsciiSet, CONTROLS, utf8_percent_encode};
use std::collections::HashMap;
use std::fmt;
use std::fmt::Display;
use widestring::U16CString;

pub(crate) fn px(inches: f32) -> String {
    format!("{}px", (inches * 48.0).round())
}

#[derive(Clone)]
pub(crate) struct AttributeSet(HashMap<&'static str, String>);

impl AttributeSet {
    pub(crate) fn new() -> Self {
        Self(HashMap::new())
    }

    pub(crate) fn set(&mut self, attribute: &'static str, value: String) {
        self.0.insert(attribute, value);
    }
}

impl<const N: usize> From<[(&'static str, String); N]> for AttributeSet {
    fn from(data: [(&'static str, String); N]) -> Self {
        Self(data.into())
    }
}

impl Display for AttributeSet {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}",
            self.0
                .iter()
                .sorted_by(|(a, _), (b, _)| Ord::cmp(a, b))
                .map(|(attr, value)| attr.to_string() + "=\"" + &value + "\"")
                .join(" ")
        )
    }
}

#[derive(Debug, Clone, Default)]
pub(crate) struct StyleSet(HashMap<&'static str, String>);

impl StyleSet {
    pub(crate) fn new() -> Self {
        Self(HashMap::new())
    }

    pub(crate) fn set(&mut self, prop: &'static str, value: String) {
        self.0.insert(prop, value);
    }

    pub(crate) fn extend(&mut self, other: Self) {
        self.0.extend(other.0.into_iter())
    }

    pub(crate) fn len(&self) -> usize {
        self.0.len()
    }

    pub(crate) fn to_html_attr(&self) -> String {
        let attr_content = format!("{}", self);
        format!("style=\"{}\"", html_entities(&attr_content))
    }
}

impl Display for StyleSet {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}",
            self.0
                .iter()
                .sorted_by(|(a, _), (b, _)| Ord::cmp(a, b))
                .map(|(attr, value)| attr.to_string() + ": " + &value + ";")
                .join(" ")
        )
    }
}

#[allow(dead_code)]
pub(crate) trait Utf16ToString {
    fn utf16_to_string(&self) -> Result<String>;
}

impl Utf16ToString for &[u8] {
    fn utf16_to_string(&self) -> Result<String> {
        let data: Vec<_> = self
            .chunks_exact(2)
            .map(|v| u16::from_le_bytes([v[0], v[1]]))
            .collect();

        let value = U16CString::from_vec_truncate(data);
        Ok(value.to_string().unwrap())
    }
}

pub(crate) fn html_entities(text: &str) -> String {
    // Match the "special chars" mode of the html-entities library:
    // https://github.com/mdevils/html-entities/blob/9ee63a120597292967f7d0d704d68d33950625ee/src/index.ts#L30
    text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&apos;")
}

pub(crate) fn url_encode(url: &str) -> String {
    const ENCODED_CHARS: &AsciiSet = &CONTROLS.add(b'\'').add(b'\n').add(b'"').add(b'<').add(b'>');
    utf8_percent_encode(url, ENCODED_CHARS).to_string()
}

#[cfg(test)]
mod test {
    use crate::utils::url_encode;

    use super::html_entities;

    #[test]
    fn should_encode_html_entities() {
        assert_eq!(
            html_entities("<a href=\"http://example.com/\">test</a>"),
            "&lt;a href=&quot;http://example.com/&quot;&gt;test&lt;/a&gt;"
        );
        assert_eq!(html_entities("&gt;"), "&amp;gt;");
        assert_eq!(html_entities("'&gt;'"), "&apos;&amp;gt;&apos;");
    }

    #[test]
    fn should_encode_urls() {
        assert_eq!(url_encode("http://example.com/"), "http://example.com/");
        assert_eq!(url_encode("http://example.com/\""), "http://example.com/%22");
    }
}
