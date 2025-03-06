//! OneNote parsing error handling.

use std::borrow::Cow;
use std::{io, string};
use thiserror::Error;

/// The result of parsing a OneNote file.
pub type Result<T> = std::result::Result<T, Error>;

/// A parsing error.
///
/// If the crate is compiled with the `backtrace` feature enabled, the
/// parsing error struct will contain a backtrace of the location where
/// the error occured. The backtrace can be accessed using
/// [`std::error::Error::backtrace()`].
#[derive(Error, Debug)]
#[error("{kind}")]
pub struct Error {
    kind: ErrorKind,
}

impl From<ErrorKind> for Error {
    fn from(kind: ErrorKind) -> Self {
        Error { kind }
    }
}

impl From<std::io::Error> for Error {
    fn from(err: std::io::Error) -> Self {
        ErrorKind::from(err).into()
    }
}

impl From<std::string::FromUtf16Error> for Error {
    fn from(err: std::string::FromUtf16Error) -> Self {
        ErrorKind::from(err).into()
    }
}

impl From<widestring::error::MissingNulTerminator> for Error {
    fn from(err: widestring::error::MissingNulTerminator) -> Self {
        ErrorKind::from(err).into()
    }
}

impl From<uuid::Error> for Error {
    fn from(err: uuid::Error) -> Self {
        ErrorKind::from(err).into()
    }
}

/// Details about a parsing error
#[allow(missing_docs)]
#[derive(Error, Debug)]
pub enum ErrorKind {
    /// Hit the end of the OneNote file before it was expected.
    #[error("Unexpected end of file")]
    UnexpectedEof,

    /// The parser was asked to process a table-of-contents file that turned out not to be one.
    #[error("Not a table of contents file: {file}")]
    NotATocFile { file: String },

    /// The parser was asked to process a section file that turned out not to be one.
    #[error("Not a section file: {file}")]
    NotASectionFile { file: String },

    /// When parsing a section group the table-of-contents file for this group was found to be missing.
    #[error("Table of contents file is missing in dir {dir}")]
    TocFileMissing { dir: String },

    /// Malformed data was encountered when parsing the OneNote file.
    #[error("Malformed data: {0}")]
    MalformedData(Cow<'static, str>),

    /// Malformed data was encountered when parsing the OneNote data.
    #[error("Malformed OneNote data: {0}")]
    MalformedOneNoteData(Cow<'static, str>),

    /// Malformed data was encountered when parsing the OneNote file contents.
    #[error("Malformed OneNote file data: {0}")]
    MalformedOneNoteFileData(Cow<'static, str>),

    /// Malformed data was encountered when parsing the OneNote file contents.
    #[error("Malformed OneNote incorrect type: {0}")]
    MalformedOneNoteIncorrectType(String),

    /// Malformed data was encountered when parsing the OneStore data.
    #[error("Malformed OneStore data: {0}")]
    MalformedOneStoreData(Cow<'static, str>),

    /// Malformed data was encountered when parsing the FSSHTTPB data.
    #[error("Malformed FSSHTTPB data: {0}")]
    MalformedFssHttpBData(Cow<'static, str>),

    /// A malformed UUID was encountered
    #[error("Invalid UUID: {err}")]
    InvalidUuid {
        #[from]
        err: uuid::Error,
    },

    /// An I/O failure was encountered during parsing.
    #[error("I/O failure: {err}")]
    IO {
        #[from]
        err: io::Error,
    },

    /// A malformed UTF-16 string was encountered during parsing.
    #[error("Malformed UTF-16 string: {err}")]
    Utf16Error {
        #[from]
        err: string::FromUtf16Error,
    },

    /// A UTF-16 string without a null terminator was encountered during parsing.
    #[error("UTF-16 string is missing null terminator: {err}")]
    Utf16MissingNull {
        #[from]
        err: widestring::error::MissingNulTerminator,
    },
}
