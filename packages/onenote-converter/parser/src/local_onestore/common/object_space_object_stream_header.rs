use parser_utils::parse::Parse;

/// See [\[MS-ONESTORE\] 2.6.5](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/34497a17-3623-4e1d-9488-a2e111a9a279)
#[derive(Debug, Clone, Copy)]
#[allow(dead_code)]
pub struct ObjectSpaceObjectStreamHeader {
    count: u32,
    a: bool,
    b: bool,
}

impl Parse for ObjectSpaceObjectStreamHeader {
    fn parse(reader: parser_utils::Reader) -> parser_utils::Result<Self> {
        let data = reader.get_u32()?;

        Ok(Self {
            count: data >> 8,
            a: data & 0x2 > 0,
            b: data & 0x1 > 0,
        })
    }
}
