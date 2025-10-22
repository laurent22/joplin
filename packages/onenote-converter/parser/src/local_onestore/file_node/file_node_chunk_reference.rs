use super::super::common::FileChunkReference;
use parser_utils::Reader;
use parser_utils::errors::{ErrorKind, Result};

/// Points to data referenced by a FileNode
/// See [\[MS-ONESTORE\] 2.2.4.2](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/150b6726-e605-441b-8233-8776ce4cdd2d)
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct FileNodeChunkReference {
    stp: Vec<u8>,
    cb: Vec<u8>,
    /// The size of the data
    cb_value: u64,
    /// The pointer
    stp_value: u64,
}

impl FileNodeChunkReference {
    pub fn parse(reader: Reader, stp_format: u32, cb_format: u32) -> Result<Self> {
        let (stp, stp_value) = match stp_format {
            0 => {
                let stp_value = reader.get_u64()?;
                let stp = Vec::from(stp_value.to_le_bytes());
                (stp, stp_value)
            }
            1 => {
                let stp_value = reader.get_u32()?;
                let stp = Vec::from(stp_value.to_le_bytes());
                (stp, stp_value as u64)
            }
            2 => {
                let value = reader.get_u16()?;
                let stp = Vec::from(value.to_le_bytes());
                let stp_value = (value as u64) * 8;
                (stp, stp_value)
            }
            3 => {
                let value = reader.get_u32()?;
                let stp = Vec::from(value.to_le_bytes());
                let stp_value = (value as u64) * 8;
                (stp, stp_value)
            }
            _ => Err(ErrorKind::MalformedOneNoteData(
                "Invalid format (reading FileNodeChunkReference.stp_value)".into(),
            ))?,
        };
        let (cb, cb_value) = match cb_format {
            0 => {
                let cb_value = reader.get_u32()?;
                let cb = Vec::from(cb_value.to_le_bytes());
                (cb, cb_value as u64)
            }
            1 => {
                let cb_value = reader.get_u64()?;
                let cb = Vec::from(cb_value.to_le_bytes());
                (cb, cb_value)
            }
            2 => {
                let value = reader.get_u8()?;
                let cb = Vec::from(value.to_le_bytes());
                let cb_value = (value as u64) * 8;
                (cb, cb_value)
            }
            3 => {
                let value = reader.get_u16()?;
                let cb = Vec::from(value.to_le_bytes());
                let cb_value = (value as u64) * 8;
                (cb, cb_value)
            }
            _ => Err(ErrorKind::MalformedOneNoteData(
                "Invalid format (reading FileNodeChunkReference.cb_value)".into(),
            ))?,
        };

        Ok(Self {
            stp,
            cb,
            cb_value,
            stp_value,
        })
    }
}

impl FileChunkReference for FileNodeChunkReference {
    fn is_fcr_nil(&self) -> bool {
        self.stp.iter().all(|v| *v == u8::MAX) && self.cb.iter().all(|v| *v == u8::MIN)
    }

    fn is_fcr_zero(&self) -> bool {
        self.stp.iter().all(|v| *v == u8::MIN) && self.cb.iter().all(|v| *v == u8::MIN)
    }

    fn data_location(&self) -> usize {
        self.stp_value as usize
    }

    fn data_size(&self) -> usize {
        self.cb_value as usize
    }
}
