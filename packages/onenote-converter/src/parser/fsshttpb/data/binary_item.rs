use crate::parser::errors::Result;
use crate::parser::fsshttpb::data::compact_u64::CompactU64;
use crate::parser::Reader;

/// A byte array with the length determined by a `CompactU64`.
///
/// See [\[MS-FSSHTTPB\] 2.2.1.3].
///
/// [\[MS-FSSHTTPB\] 2.2.1.3]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/6bdda105-af7f-4757-8dbe-0c7f3100647e
pub(crate) struct BinaryItem(Vec<u8>);

impl BinaryItem {
    pub(crate) fn parse(reader: Reader) -> Result<BinaryItem> {
        let size = CompactU64::parse(reader)?.value();
        let data = reader.read(size as usize)?.to_vec();

        Ok(BinaryItem(data))
    }

    pub(crate) fn value(self) -> Vec<u8> {
        self.0
    }
}
