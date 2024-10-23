use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::references::References;
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;
use crate::parser::onestore::types::compact_id::CompactId;
use crate::parser::onestore::types::property::PropertyValue;

/// A generic object reference.
///
/// This allows for all sorts of object references (e.g. pages referencing their content).
/// It implements parsing these references from the OneStore mapping table.
pub(crate) struct ObjectReference;

impl ObjectReference {
    pub(crate) fn parse(prop_type: PropertyType, object: &Object) -> Result<Option<ExGuid>> {
        // Validate the value of the property
        match object.props().get(prop_type) {
            Some(property) => property.to_object_id().ok_or_else(|| {
                ErrorKind::MalformedOneNoteFileData("object reference is not a object id".into())
            })?,
            None => return Ok(None),
        };

        // Find the correct object reference
        let index = Self::get_offset(prop_type, object)?;

        let id = object
            .props()
            .object_ids()
            .iter()
            .nth(index)
            .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("object id index corrupt".into()))?;

        Ok(Self::resolve_id(index, id, object))
    }

    pub(crate) fn parse_vec(
        prop_type: PropertyType,
        object: &Object,
    ) -> Result<Option<Vec<ExGuid>>> {
        // Determine the number of object references
        let count = match object.props().get(prop_type) {
            Some(prop) => prop.to_object_ids().ok_or_else(|| {
                ErrorKind::MalformedOneNoteFileData(
                    "object reference array is not a object id array".into(),
                )
            })?,
            None => return Ok(None),
        };

        // Determine offset for the property for which we want to look up the object reference
        let offset = Self::get_offset(prop_type, object)?;

        let references = object.props().object_ids();

        // Look up the object references by offset/count and resolve them
        let object_ids = references
            .iter()
            .skip(offset)
            .take(count as usize)
            .enumerate()
            .flat_map(|(index, id)| Self::resolve_id(index + offset, id, object))
            .collect();

        Ok(Some(object_ids))
    }

    pub(crate) fn get_offset(prop_type: PropertyType, object: &Object) -> Result<usize> {
        let predecessors = References::get_predecessors(prop_type, object)?;
        let offset = Self::count_references(predecessors);

        Ok(offset)
    }

    pub(crate) fn count_references<'a>(props: impl Iterator<Item = &'a PropertyValue>) -> usize {
        props
            .map(|v| match v {
                PropertyValue::ObjectId => 1,
                PropertyValue::ObjectIds(c) => *c as usize,
                PropertyValue::PropertyValues(_, sets) => sets
                    .iter()
                    .map(|set| Self::count_references(set.values()))
                    .sum(),
                _ => 0,
            })
            .sum()
    }

    fn resolve_id(index: usize, id: &CompactId, object: &Object) -> Option<ExGuid> {
        object.mapping().get_object(index, *id)
    }
}
