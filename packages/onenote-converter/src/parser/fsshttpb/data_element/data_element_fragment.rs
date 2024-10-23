use crate::parser::errors::Result;
use crate::parser::fsshttpb::data::compact_u64::CompactU64;
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::fsshttpb::data::object_types::ObjectType;
use crate::parser::fsshttpb::data::stream_object::ObjectHeader;
use crate::parser::fsshttpb::data_element::DataElement;
use crate::parser::Reader;

/// A data element fragment.
///
/// See [\[MS-FSSHTTPB\] 2.2.1.12.7].
///
/// [\[MS-FSSHTTPB\] 2.2.1.12.7]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/9a860e3b-cf61-484b-8ee3-d875afaf7a05
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct DataElementFragment {
    pub(crate) id: ExGuid,
    pub(crate) size: u64,
    pub(crate) chunk_reference: DataElementFragmentChunkReference,
    pub(crate) data: Vec<u8>,
}

#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct DataElementFragmentChunkReference {
    pub(crate) offset: u64,
    pub(crate) length: u64,
}

impl DataElement {
    /// Parse a data element fragment.
    ///
    /// See [\[MS-FSSHTTPB\] 2.2.1.12.7]
    ///
    /// [\[MS-FSSHTTPB\] 2.2.1.12.7]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/9a860e3b-cf61-484b-8ee3-d875afaf7a05
    pub(crate) fn parse_data_element_fragment(reader: Reader) -> Result<DataElementFragment> {
        ObjectHeader::try_parse(reader, ObjectType::DataElementFragment)?;

        let id = ExGuid::parse(reader)?;
        let size = CompactU64::parse(reader)?.value();
        let offset = CompactU64::parse(reader)?.value();
        let length = CompactU64::parse(reader)?.value();

        let data = reader.read(size as usize)?.to_vec();

        let chunk_reference = DataElementFragmentChunkReference { offset, length };
        let fragment = DataElementFragment {
            id,
            size,
            chunk_reference,
            data,
        };

        Ok(fragment)
    }
}
