use crate::parser::errors::Result;
use crate::parser::Reader;
use std::fmt;

/// An object type.
///
/// See [\[MS-ONESTORE\] 2.6.14].
///
/// [\[MS-ONESTORE\] 6.14.2]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/388c266c-08e4-4ea4-af0e-5e2c5d1b995c
#[derive(Copy, Clone, PartialEq)]
pub(crate) struct JcId(pub(crate) u32);

impl JcId {
    pub(crate) fn parse(reader: Reader) -> Result<JcId> {
        reader.get_u32().map(JcId)
    }
}

impl fmt::Debug for JcId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "JcId(0x{:08X})", self.0)
    }
}
