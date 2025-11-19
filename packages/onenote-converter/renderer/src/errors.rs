use color_eyre::eyre::Error as ColorError;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Error, Debug)]
#[error("{kind}")]
pub struct Error {
    pub kind: ErrorKind,
}

impl From<parser_utils::errors::Error> for Error {
    fn from(value: parser_utils::errors::Error) -> Self {
        Self {
            kind: ErrorKind::ParseFailed(value),
        }
    }
}

impl From<ColorError> for Error {
    fn from(value: ColorError) -> Self {
        Self {
            kind: ErrorKind::OtherError(value),
        }
    }
}

impl From<std::io::Error> for Error {
    fn from(value: std::io::Error) -> Self {
        Self {
            kind: ErrorKind::IoError(value),
        }
    }
}

impl From<ErrorKind> for Error {
    fn from(kind: ErrorKind) -> Self {
        Self { kind }
    }
}

#[derive(Error, Debug)]
pub enum ErrorKind {
    #[error("Parsing failed: {0}")]
    ParseFailed(parser_utils::errors::Error),

    #[error("Rendering failed: {0}")]
    RenderFailed(String),

    #[error("IO failure: {0}")]
    IoError(std::io::Error),

    #[error("Failure: {0}")]
    OtherError(ColorError),
}
