use crate::one::property::PropertyType;
use crate::shared::property::{PropertyId, PropertyValue};
use parser_utils::Reader;
use parser_utils::errors::Result;
use std::collections::HashMap;
use std::fmt::Debug;

/// A property set.
///
/// See [\[MS-ONESTORE\] 2.6.7].
///
/// [\[MS-ONESTORE\] 2.6.7]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/88a64c18-f815-4ebc-8590-ddd432024ab9
#[derive(Clone, Default)]
pub(crate) struct PropertySet {
    /// Maps from PropertyId values to (index, PropertyValue).
    /// Values for PropertyId can be found in [\[MS-ONESTORE\] 2.1.12](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-one/e9bf7da8-7aab-4668-be5e-e0c421175e3c).
    ///
    /// For example, to get the value of the "bold" property, use
    /// ```skip
    /// let propset = PropertySet::fallback();
    /// assert_eq!(propset.get(PropertyType::Bold), None);
    /// ```
    values: HashMap<u32, (usize, PropertyValue)>,
}

impl Debug for PropertySet {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut debug_map = f.debug_map();
        for (key, (_, value)) in &self.values {
            let formatted_key = format!("{:#0x}", key);
            // Use the default compact representation of the value
            let formatted_value = format!("{:?}", value);
            debug_map.entry(&formatted_key, &formatted_value);
        }
        debug_map.finish()
    }
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

    pub(crate) fn get_from_type(&self, prop_type: PropertyType) -> Option<&PropertyValue> {
        self.get(PropertyId::new(prop_type as u32))
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
