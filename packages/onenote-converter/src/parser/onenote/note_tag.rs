use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::color_ref::ColorRef;
use crate::parser::one::property::note_tag::{ActionItemStatus, ActionItemType};
use crate::parser::one::property::note_tag_property_status::NoteTagPropertyStatus;
use crate::parser::one::property::note_tag_shape::NoteTagShape;
use crate::parser::one::property::time::Time;
use crate::parser::one::property_set::note_tag_container::Data;
use crate::parser::one::property_set::note_tag_shared_definition_container;
use crate::parser::onestore::object_space::ObjectSpace;

/// A note tag.
///
/// See [\[MS-ONE\] 2.2.42].
///
/// [\[MS-ONE\] 2.2.42]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/283e1611-05cb-4468-9be1-2879a3d1c17d
#[derive(Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Debug)]
pub struct NoteTag {
    completed_at: Option<Time>,
    item_status: ActionItemStatus,
    definition: Option<NoteTagDefinition>,
}

impl NoteTag {
    /// When the task has been completed.
    ///
    /// Only set for task-like note tags.
    ///
    /// See [\[MS-ONE\] 2.3.90].
    ///
    /// [\[MS-ONE\] 2.3.90]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/2261a830-3dee-42a8-ab85-97686ebe35bc
    pub fn completed_at(&self) -> Option<Time> {
        self.completed_at
    }

    /// The status of the note tag.
    pub fn item_status(&self) -> ActionItemStatus {
        self.item_status
    }

    /// The style and format definition for this note tag.
    pub fn definition(&self) -> Option<&NoteTagDefinition> {
        self.definition.as_ref()
    }
}

/// The definition of a note tag.
///
/// See [\[MS-ONE\] 2.3.41].
///
/// [\[MS-ONE\] 2.3.41]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/eb5f52d2-c507-45c8-9bda-f8c74d34533a
#[derive(Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Debug)]
pub struct NoteTagDefinition {
    label: String,
    status: NoteTagPropertyStatus,
    shape: NoteTagShape,
    highlight_color: Option<ColorRef>,
    text_color: Option<ColorRef>,
    action_item_type: ActionItemType,
}

impl NoteTagDefinition {
    /// The note tag's name.
    pub fn label(&self) -> &str {
        &self.label
    }

    /// The note tag's status
    pub fn status(&self) -> &NoteTagPropertyStatus {
        &self.status
    }

    /// The note tag icon shape.
    pub fn shape(&self) -> NoteTagShape {
        self.shape
    }

    /// The note tag's text highlight color.
    pub fn highlight_color(&self) -> Option<ColorRef> {
        self.highlight_color
    }

    /// The note tag's text color.
    pub fn text_color(&self) -> Option<ColorRef> {
        self.text_color
    }

    /// The note tag's action item type.
    pub fn action_item_type(&self) -> ActionItemType {
        self.action_item_type
    }
}

pub(crate) fn parse_note_tags(note_tags: Vec<Data>, space: &ObjectSpace) -> Result<Vec<NoteTag>> {
    note_tags
        .into_iter()
        .map(|data| {
            Ok(NoteTag {
                completed_at: data.completed_at,
                item_status: data.item_status,
                definition: data
                    .definition
                    .map(|definition_id| parse_note_tag_definition(definition_id, space))
                    .transpose()?,
            })
        })
        .collect()
}

pub(crate) fn parse_note_tag_definition(
    definition_id: ExGuid,
    space: &ObjectSpace,
) -> Result<NoteTagDefinition> {
    let object = space
        .get_object(definition_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("note tag definition is missing".into()))?;

    let data = note_tag_shared_definition_container::parse(object)?;

    let definition = NoteTagDefinition {
        label: data.label,
        status: data.status,
        shape: data.shape,
        highlight_color: data.highlight_color,
        text_color: data.text_color,
        action_item_type: data.action_item_type,
    };

    Ok(definition)
}
