use crate::one::property::PropertyType;
use crate::onestore::object::Object;
use crate::shared::property::{PropertyId, PropertyValue};
use parser_utils::errors::{ErrorKind, Result};

pub(crate) struct References;

impl References {
    pub(crate) fn get_predecessors<'a>(
        prop_type: PropertyType,
        object: &'a Object,
    ) -> Result<impl Iterator<Item = &'a PropertyValue>> {
        let prop_index = object
            .props()
            .properties()
            .index(PropertyId::new(prop_type as u32))
            .ok_or_else(|| {
                ErrorKind::MalformedOneNoteFileData(
                    format!("no object offset for property {:?}", prop_type).into(),
                )
            })?;

        let predecessors = object
            .props()
            .properties()
            .values_with_index()
            .filter(move |(idx, _)| *idx < prop_index)
            .map(|(_, value)| value);

        Ok(predecessors)
    }
}
