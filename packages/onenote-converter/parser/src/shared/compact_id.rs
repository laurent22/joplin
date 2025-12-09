use parser_utils::Reader;
use parser_utils::errors::Result;

/// A compact reference to an ID in the mapping table.
///
/// See [\[MS-ONESTORE\] 2.2.2].
///
/// [\[MS-ONESTORE\] 2.2.2]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/8de02f24-9b9c-48a9-bd26-5c0230814bf4
#[derive(Debug, Hash, Eq, PartialEq, Copy, Clone)]
pub(crate) struct CompactId {
    pub n: u8,
    pub guid_index: u32,
}

impl CompactId {
    pub(crate) fn parse(reader: Reader) -> Result<CompactId> {
        let data = reader.get_u32()?;

        let n = (data & 0xFF) as u8;
        let guid_index = data >> 8;

        Ok(CompactId { n, guid_index })
    }
}
