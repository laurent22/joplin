use crate::parser::errors::Result;
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::types::compact_id::CompactId;
use crate::parser::onestore::types::object_stream_header::ObjectStreamHeader;
use crate::parser::onestore::types::prop_set::PropertySet;
use crate::parser::onestore::types::property::{PropertyId, PropertyValue};
use crate::parser::Reader;

/// An object's properties.
///
/// See [\[MS-ONESTORE\] 2.1.1].
///
/// [\[MS-ONESTORE\] 2.1.1]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/e9fb4b61-5128-45dd-9a96-6bad6f11dc18
#[derive(Debug, Clone)]
pub(crate) struct ObjectPropSet {
    pub(crate) object_ids: Vec<CompactId>,
    pub(crate) object_space_ids: Vec<CompactId>,
    pub(crate) context_ids: Vec<CompactId>,
    pub(crate) properties: PropertySet,
}

impl ObjectPropSet {
    pub(crate) fn object_ids(&self) -> &[CompactId] {
        &self.object_ids
    }

    pub(crate) fn object_space_ids(&self) -> &[CompactId] {
        &self.object_space_ids
    }

    pub(crate) fn context_ids(&self) -> &[CompactId] {
        &self.context_ids
    }

    pub(crate) fn properties(&self) -> &PropertySet {
        &self.properties
    }
}

impl ObjectPropSet {
    pub(crate) fn parse(reader: Reader) -> Result<ObjectPropSet> {
        let header = ObjectStreamHeader::parse(reader)?;
        let object_ids = (0..header.count)
            .map(|_| CompactId::parse(reader))
            .collect::<Result<Vec<_>>>()?;

        let mut object_space_ids = vec![];
        let mut context_ids = vec![];

        if !header.osid_stream_not_present {
            let header = ObjectStreamHeader::parse(reader)?;

            object_space_ids = (0..header.count)
                .map(|_| CompactId::parse(reader))
                .collect::<Result<Vec<_>>>()?;

            if header.extended_streams_present {
                let header = ObjectStreamHeader::parse(reader)?;
                context_ids = (0..header.count)
                    .map(|_| CompactId::parse(reader))
                    .collect::<Result<Vec<_>>>()?;
            };
        }

        let properties = PropertySet::parse(reader)?;

        Ok(ObjectPropSet {
            object_ids,
            object_space_ids,
            context_ids,
            properties,
        })
    }

    pub(crate) fn get(&self, prop_type: PropertyType) -> Option<&PropertyValue> {
        self.properties.get(PropertyId::new(prop_type as u32))
    }
}
