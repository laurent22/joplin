use crate::parser::errors::Result;
use crate::parser::fsshttpb::data::compact_u64::CompactU64;
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::Reader;

/// A FSSHTTP cell identifier.
///
/// See [\[MS-FSSHTTPB\] 2.2.1.10] and [\[MS-FSSHTTPB\] 2.2.1.11].
///
/// [\[MS-FSSHTTPB\] 2.2.1.10]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/75bf8297-ef9c-458a-95a3-ad6265bfa864
/// [\[MS-FSSHTTPB\] 2.2.1.11]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/d3f4d22d-6fb4-4032-8587-f3eb9c256e45
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct CellId(pub ExGuid, pub ExGuid);

impl CellId {
    pub(crate) fn parse(reader: Reader) -> Result<CellId> {
        let first = ExGuid::parse(reader)?;
        let second = ExGuid::parse(reader)?;

        Ok(CellId(first, second))
    }

    pub(crate) fn parse_array(reader: Reader) -> Result<Vec<CellId>> {
        let mut values = vec![];

        let count = CompactU64::parse(reader)?.value();
        for _ in 0..count {
            values.push(CellId::parse(reader)?);
        }

        Ok(values)
    }
}
