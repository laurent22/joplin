use percent_encoding::AsciiSet;
use std::path;

pub(crate) mod notebook;
pub(crate) mod page;
pub(crate) mod section;

const ASCII_SET: AsciiSet = percent_encoding::NON_ALPHANUMERIC.remove(path::MAIN_SEPARATOR as u8);

#[allow(clippy::unnecessary_wraps)]
pub(crate) fn url_encode(str: &str) -> ::askama::Result<String> {
    Ok(percent_encoding::utf8_percent_encode(&str, &ASCII_SET).to_string())
}
