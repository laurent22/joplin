//! Utilities shared between the parser and renderer.

use widestring::U16CString;

pub mod errors;
mod file_api;
pub mod log;
pub mod parse;
pub mod reader;

pub use errors::Result;
pub use file_api::FileHandle;
pub use file_api::fs_driver;

pub type Reader<'a, 'b> = &'b mut crate::reader::Reader<'a>;

pub trait Utf16ToString {
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
