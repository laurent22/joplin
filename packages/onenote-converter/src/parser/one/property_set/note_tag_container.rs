use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::note_tag::ActionItemStatus;
use crate::parser::one::property::object_reference::ObjectReference;
use crate::parser::one::property::object_space_reference::ObjectSpaceReference;
use crate::parser::one::property::time::Time;
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;
use crate::parser::onestore::types::compact_id::CompactId;
use crate::parser::onestore::types::jcid::JcId;
use crate::parser::onestore::types::object_prop_set::ObjectPropSet;
use crate::parser::onestore::types::prop_set::PropertySet;
use crate::parser::onestore::types::property::PropertyId;

/// A note tag state container.
///
/// See [\[MS-ONE\] 2.2.88].
///
/// [\[MS-ONE\] 2.2.88]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/a9938236-87f8-41b1-81f3-5f760e1247b8
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Data {
    pub(crate) definition: Option<ExGuid>,
    pub(crate) created_at: Time,
    pub(crate) completed_at: Option<Time>,
    pub(crate) item_status: ActionItemStatus,
}

impl Data {
    pub(crate) fn parse(object: &Object) -> Result<Option<Vec<Data>>> {
        let (prop_id, prop_sets) = match object.props().get(PropertyType::NoteTags) {
            Some(value) => value.to_property_values().ok_or_else(|| {
                ErrorKind::MalformedOneNoteFileData(
                    "note tag state is not a property values list".into(),
                )
            })?,
            None => return Ok(None),
        };

        let data = prop_sets
            .iter()
            .map(|props| {
                let object = Self::parse_object(object, prop_id, props)?;
                let data = Self::parse_data(object)?;

                Ok(data)
            })
            .collect::<Result<Vec<_>>>()?;

        Ok(Some(data))
    }

    fn parse_data(object: Object) -> Result<Data> {
        let definition = ObjectReference::parse(PropertyType::NoteTagDefinitionOid, &object)?;

        let created_at = Time::parse(PropertyType::NoteTagCreated, &object)?.ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("note tag has no created at time".into())
        })?;

        let completed_at = Time::parse(PropertyType::NoteTagCompleted, &object)?;

        let item_status = ActionItemStatus::parse(&object)?.ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("note tag container has no item status".into())
        })?;

        Ok(Data {
            definition,
            created_at,
            completed_at,
            item_status,
        })
    }

    fn parse_object<'a>(
        object: &'a Object,
        id: PropertyId,
        props: &PropertySet,
    ) -> Result<Object<'a>> {
        Ok(Object {
            context_id: object.context_id,
            jc_id: JcId(id.value()),
            props: ObjectPropSet {
                object_ids: Self::get_object_ids(props, object)?,
                object_space_ids: Self::get_object_space_ids(props, object)?,
                context_ids: vec![],
                properties: props.clone(),
            },
            file_data: None,
            mapping: object.mapping.clone(),
        })
    }

    fn get_object_ids(props: &PropertySet, object: &Object) -> Result<Vec<CompactId>> {
        Ok(object
            .props
            .object_ids
            .iter()
            .skip(ObjectReference::get_offset(PropertyType::NoteTags, object)?)
            .take(ObjectReference::count_references(props.values()))
            .copied()
            .collect())
    }

    fn get_object_space_ids(props: &PropertySet, object: &Object) -> Result<Vec<CompactId>> {
        Ok(object
            .props
            .object_ids
            .iter()
            .skip(ObjectSpaceReference::get_offset(
                PropertyType::NoteTags,
                object,
            )?)
            .take(ObjectSpaceReference::count_references(props.values()))
            .copied()
            .collect())
    }
}
