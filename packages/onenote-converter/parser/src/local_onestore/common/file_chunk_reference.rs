use parser_utils::{errors::ErrorKind, errors::Result, parse::Parse};

/// See [\[MS-ONESTORE\] 2.2.4](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/0d86b13d-d58c-44e8-b931-4728b9d39a4b)
pub trait FileChunkReference {
    fn is_fcr_nil(&self) -> bool;
    fn is_fcr_zero(&self) -> bool;
    fn data_location(&self) -> usize;
    fn data_size(&self) -> usize;

    fn resolve_to_reader<'a>(
        &self,
        original_reader: &parser_utils::reader::Reader<'a>,
    ) -> Result<parser_utils::reader::Reader<'a>> {
        if self.is_fcr_nil() {
            return Err(ErrorKind::ResolutionFailed(
                "Failed to resolve node reference -- is nil".into(),
            )
            .into());
        }

        original_reader.with_updated_bounds(
            self.data_location(),
            self.data_location() + self.data_size(),
        )
    }
}

/// See [\[MS-ONESTORE\] 2.2.4.1](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/f77f021e-57b1-4dff-9254-985f514a0d89)
#[derive(Debug, Clone, Parse)]
pub struct FileChunkReference32 {
    /// Data location
    stp: u32,
    /// Data size
    cb: u32,
}

impl FileChunkReference for FileChunkReference32 {
    fn is_fcr_nil(&self) -> bool {
        self.stp == u32::MAX && self.cb == u32::MIN
    }

    fn is_fcr_zero(&self) -> bool {
        self.stp == u32::MIN && self.cb == u32::MIN
    }

    fn data_location(&self) -> usize {
        self.stp as usize
    }

    fn data_size(&self) -> usize {
        self.cb as usize
    }
}

/// See [\[MS-ONESTORE\] 2.2.4.4]: https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/e2815e73-bd04-42fc-838e-6e86ab192e54
#[derive(Debug, Clone, Parse)]
pub struct FileChunkReference64x32 {
    pub stp: u64,
    pub cb: u32,
}

impl FileChunkReference for FileChunkReference64x32 {
    fn is_fcr_nil(&self) -> bool {
        self.stp == u64::MAX && self.cb == u32::MIN
    }

    fn is_fcr_zero(&self) -> bool {
        self.stp == u64::MIN && self.cb == u32::MIN
    }

    fn data_location(&self) -> usize {
        self.stp as usize
    }

    fn data_size(&self) -> usize {
        self.cb as usize
    }
}

/// See [\[MS-ONESTORE\] 2.2.4.4]: https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/e2815e73-bd04-42fc-838e-6e86ab192e54
#[derive(Debug, Clone, Parse)]
pub struct FileChunkReference64 {
    stp: u64,
    cb: u64,
}

impl FileChunkReference for FileChunkReference64 {
    fn is_fcr_nil(&self) -> bool {
        self.stp == u64::MAX && self.cb == u64::MIN
    }

    fn is_fcr_zero(&self) -> bool {
        self.stp == u64::MIN && self.cb == u64::MIN
    }

    fn data_location(&self) -> usize {
        self.stp as usize
    }

    fn data_size(&self) -> usize {
        self.cb as usize
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use parser_utils::reader::Reader;

    #[test]
    fn parse_file_chunk_32() {
        let data: [u8; 8] = [8, 0, 0, 0, 0, 0, 0, 0];
        let mut reader = Reader::new(&data);
        let parsed = FileChunkReference32::parse(&mut reader).unwrap();
        assert_eq!(parsed.stp, 8);
        assert_eq!(parsed.cb, 0);
    }
}
