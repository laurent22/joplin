use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::color_ref::ColorRef;
use crate::parser::one::property_set::number_list_node;
use crate::parser::onestore::object_space::ObjectSpace;

/// A list definition.
///
/// See [\[MS-ONE\] 2.2.25].
///
/// [\[MS-ONE\]] 2.2.25: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/1a141e7a-4455-4971-bf0b-1621e221984e
#[derive(Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Debug)]
pub struct List {
    pub(crate) list_font: Option<String>,
    pub(crate) list_restart: Option<i32>,
    pub(crate) list_format: Vec<char>,
    pub(crate) bold: bool,
    pub(crate) italic: bool,
    // pub(crate) language_code: Option<u32>,
    pub(crate) font: Option<String>,
    pub(crate) font_size: Option<u16>,
    pub(crate) font_color: Option<ColorRef>,
}

impl List {
    /// The font used for the symbol of the list bullet.
    ///
    /// See [\[MS-ONE\] 2.2.1].
    ///
    /// [\[MS-ONE\] 2.2.1]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/f4557c94-0081-4518-89f2-a3867714e5f3
    pub fn list_font(&self) -> Option<&str> {
        self.list_font.as_deref()
    }

    /// Restart the list numbering with this index.
    ///
    /// See [\[MS-ONE\] 2.3.43].
    ///
    /// [\[MS-ONE\] 2.3.43]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/b6971dae-d81a-4a7d-b640-661e9c0baa17
    pub fn list_restart(&self) -> Option<i32> {
        self.list_restart
    }

    /// The list format specifier.
    ///
    /// The value of the list format specifier is described in [\[MS-ONE\] 2.3.20].
    ///
    /// [\[MS-ONE\] 2.3.20]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/587f8d1c-e0c3-434f-8e02-c9b4e710c0b3
    pub fn list_format(&self) -> &[char] {
        &self.list_format
    }

    /// Whether to apply bold formatting to the list index number.
    pub fn bold(&self) -> bool {
        self.bold
    }

    /// Whether to apply italic formatting to the list index number.
    pub fn italic(&self) -> bool {
        self.italic
    }

    /// The font to use for the list index number.
    pub fn font(&self) -> Option<&str> {
        self.font.as_deref()
    }

    /// The font size in half-point increments used for the list index number or bullet.
    ///
    /// See [\[MS-ONE\] 2.3.16].
    ///
    /// [\[MS-ONE\] 2.3.16]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/f209fd9c-9042-4df2-b90c-1be20ac9c2d3
    pub fn font_size(&self) -> Option<u16> {
        self.font_size
    }

    /// The font color used for the list index number or bullet.
    ///
    /// See [\[MS-ONE\] 2.2.45].
    ///
    /// [\[MS-ONE\] 2.2.45]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/17a7e6a7-7fa9-456f-a3fe-b2d8fef31be3
    pub fn font_color(&self) -> Option<ColorRef> {
        self.font_color
    }
}

pub(crate) fn parse_list(list_id: ExGuid, space: &ObjectSpace) -> Result<List> {
    let object = space
        .get_object(list_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("rich text content is missing".into()))?;
    let data = number_list_node::parse(object)?;

    // TODO: Parse language code

    let list = List {
        list_font: data.list_font,
        list_restart: data.list_restart,
        list_format: data.list_format,
        bold: data.bold,
        italic: data.italic,
        font: data.font,
        font_size: data.font_size,
        font_color: data.font_color,
    };

    Ok(list)
}
