use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;

/// The action status of a note tag.
///
/// See [\[MS-ONE\] 2.3.91].
///
/// [\[MS-ONE\] 2.3.91]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/6b516f12-8f47-40b3-9dd4-44c00aac206b
#[derive(Copy, Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Debug)]
pub struct ActionItemStatus {
    completed: bool,
    disabled: bool,
    task_tag: bool,
}

impl ActionItemStatus {
    /// Whether the checkable note tag is completed.
    pub fn completed(&self) -> bool {
        self.completed
    }

    /// Whether the note tag is disabled.
    pub fn disabled(&self) -> bool {
        self.disabled
    }

    /// Whether the note tag is a task tag.
    pub fn task_tag(&self) -> bool {
        self.task_tag
    }
}

impl ActionItemStatus {
    pub(crate) fn parse(object: &Object) -> Result<Option<ActionItemStatus>> {
        let value = match object.props().get(PropertyType::ActionItemStatus) {
            Some(value) => value.to_u16().ok_or_else(|| {
                ErrorKind::MalformedOneNoteFileData("action item status is not a u16".into())
            })?,
            None => return Ok(None),
        };

        let completed = value & 0x1 != 0;
        let disabled = (value >> 1) & 0x1 != 0;
        let task_tag = (value >> 2) & 0x1 != 0;

        Ok(Some(ActionItemStatus {
            completed,
            disabled,
            task_tag,
        }))
    }
}

/// The identifier and item type of a note tag.
///
/// See [\[MS-ONE\] 2.3.85].
///
/// [\[MS-ONE\] 2.3.85]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/b39a1d88-b8e1-48c6-bbfe-99ac3effe91b
#[derive(Copy, Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Debug)]
#[allow(missing_docs)]
pub enum ActionItemType {
    Numeric(u16),
    DueToday,
    DueTomorrow,
    DueThisWeek,
    DueNextWeek,
    NoDueDate,
    CustomDueDate,
    Unknown,
}

impl ActionItemType {
    pub(crate) fn parse(object: &Object) -> Result<Option<ActionItemType>> {
        let value = match object.props().get(PropertyType::ActionItemType) {
            Some(value) => value.to_u16().ok_or_else(|| {
                ErrorKind::MalformedOneNoteFileData("action item type is not a u16".into())
            })?,
            None => return Ok(None),
        };

        let item_type = match value {
            0..=99 => ActionItemType::Numeric(value),
            100 => ActionItemType::DueToday,
            101 => ActionItemType::DueTomorrow,
            102 => ActionItemType::DueThisWeek,
            103 => ActionItemType::DueNextWeek,
            104 => ActionItemType::NoDueDate,
            105 => ActionItemType::CustomDueDate,
            _ => ActionItemType::Unknown,
        };

        Ok(Some(item_type))
    }
}
