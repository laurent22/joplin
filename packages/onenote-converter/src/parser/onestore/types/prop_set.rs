use crate::parser::errors::Result;
use crate::parser::onestore::types::property::{PropertyId, PropertyValue};
use crate::parser::Reader;
use std::collections::HashMap;

/// A property set.
///
/// See [\[MS-ONESTORE\] 2.6.7].
///
/// [\[MS-ONESTORE\] 2.6.7]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/88a64c18-f815-4ebc-8590-ddd432024ab9
#[derive(Debug, Clone)]
pub(crate) struct PropertySet {
    values: HashMap<u32, (usize, PropertyValue)>,
}

impl PropertySet {
    pub fn fallback() -> PropertySet {
        return PropertySet {
            values: HashMap::from([]),
        };
    }

    pub(crate) fn parse(reader: Reader) -> Result<PropertySet> {
        let count = reader.get_u16()?;

        let property_ids: Vec<_> = (0..count)
            .map(|_| PropertyId::parse(reader))
            .collect::<Result<_>>()?;

        let values = property_ids
            .into_iter()
            .enumerate()
            .map(|(idx, id)| Ok((id.id(), (idx, PropertyValue::parse(id, reader)?))))
            .collect::<Result<_>>()?;

        Ok(PropertySet { values })
    }

    pub(crate) fn get(&self, id: PropertyId) -> Option<&PropertyValue> {
        self.values.get(&id.id()).map(|(_, value)| value)
    }

    pub(crate) fn index(&self, id: PropertyId) -> Option<usize> {
        self.values.get(&id.id()).map(|(index, _)| index).copied()
    }

    pub(crate) fn values(&self) -> impl Iterator<Item = &PropertyValue> {
        self.values.values().map(|(_, value)| value)
    }

    pub(crate) fn values_with_index(&self) -> impl Iterator<Item = &(usize, PropertyValue)> {
        self.values.values()
    }
}
