use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::color::Color;
use crate::parser::one::property::layout_alignment::LayoutAlignment;
use crate::parser::one::property::outline_indent_distance::OutlineIndentDistance;
use crate::parser::one::property_set::{table_cell_node, table_node, table_row_node};
use crate::parser::onenote::note_tag::{parse_note_tags, NoteTag};
use crate::parser::onenote::outline::{parse_outline_element, OutlineElement};
use crate::parser::onestore::object_space::ObjectSpace;

/// A table.
///
/// See [\[MS-ONE\] 2.2.26].
///
/// [\[MS-ONE\] 2.2.26]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/9046980a-2410-4b2d-8a35-ec06e55648e0
#[derive(Clone, Debug)]
pub struct Table {
    pub(crate) rows: u32,
    pub(crate) cols: u32,
    pub(crate) contents: Vec<TableRow>,

    pub(crate) cols_locked: Vec<u8>,
    pub(crate) col_widths: Vec<f32>,

    pub(crate) borders_visible: bool,

    pub(crate) layout_alignment_in_parent: Option<LayoutAlignment>,
    pub(crate) layout_alignment_self: Option<LayoutAlignment>,

    pub(crate) note_tags: Vec<NoteTag>,
}

impl Table {
    /// The number of rows in this table.
    pub fn rows(&self) -> u32 {
        self.rows
    }

    /// The number of columns in this table.
    pub fn cols(&self) -> u32 {
        self.cols
    }

    /// The table rows.
    pub fn contents(&self) -> &[TableRow] {
        &self.contents
    }

    /// Which columns have a locked width.
    ///
    /// To determine if column `c` has a locked with, calculate:
    ///
    /// ```ignore
    /// table.cols_locked()[c / 8] & (1 << (c % 8)) == 1;
    /// ```
    ///
    /// See [\[MS-ONE\] 2.3.70].
    ///
    /// [\[MS-ONE\] 2.3.70]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/465c1f7c-63be-4d8b-a8de-76924afe92c2
    pub fn cols_locked(&self) -> &[u8] {
        &self.cols_locked
    }

    /// The column widths in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.66].
    ///
    /// [\[MS-ONE\] 2.3.66]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/aea7e232-e7f3-444b-8d2c-e8f46fa8cc59
    pub fn col_widths(&self) -> &[f32] {
        &self.col_widths
    }

    /// Whether the table borders are visible.
    ///
    /// See [\[MS-ONE\] 2.3.65].
    ///
    /// [\[MS-ONE\] 2.3.65]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/37be8f3c-e015-4c45-be99-615a669439b8
    pub fn borders_visible(&self) -> bool {
        self.borders_visible
    }

    /// The table's alignment relative to the containing outline element (if present).
    ///
    /// See [\[MS-ONE\] 2.3.27].
    ///
    /// [\[MS-ONE\] 2.3.27]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/61fa50be-c355-4b8d-ac01-761a2f7f66c0
    pub fn layout_alignment_in_parent(&self) -> Option<LayoutAlignment> {
        self.layout_alignment_in_parent
    }

    /// The table's alignment.
    ///
    /// See [\[MS-ONE\] 2.3.33].
    ///
    /// [\[MS-ONE\] 2.3.33]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/4e7fe9db-2fdb-4239-b291-dc4b909c94ad
    pub fn layout_alignment_self(&self) -> Option<LayoutAlignment> {
        self.layout_alignment_self
    }

    /// Note tags for this table.
    pub fn note_tags(&self) -> &[NoteTag] {
        &self.note_tags
    }
}

/// A table row.
///
/// See [\[MS-ONE\] 2.2.27].
///
/// [\[MS-ONE\] 2.2.27]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/d22af1aa-5e0b-40ed-b914-f6397979d6b0
#[derive(Clone, Debug)]
pub struct TableRow {
    pub(crate) contents: Vec<TableCell>,
}

impl TableRow {
    /// The cells in the table row.
    pub fn contents(&self) -> &[TableCell] {
        &self.contents
    }
}

/// A table cell.
///
/// See [\[MS-ONE\] 2.2.28].
///
/// [\[MS-ONE\] 2.2.28]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/e5660d6b-72c3-4d9f-bad0-435c00f42183
#[derive(Clone, Debug)]
pub struct TableCell {
    pub(crate) contents: Vec<OutlineElement>,

    pub(crate) background_color: Option<Color>,
    pub(crate) layout_max_width: Option<f32>,
    pub(crate) outline_indent_distance: OutlineIndentDistance,
}

impl TableCell {
    /// The contents of the table cell.
    pub fn contents(&self) -> &[OutlineElement] {
        &self.contents
    }

    /// The content's max width in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.22].
    ///
    /// [\[MS-ONE\] 2.3.22]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/a770ac4b-2225-4aa6-ba92-d3a51f97c405
    pub fn layout_max_width(&self) -> Option<f32> {
        self.layout_max_width
    }

    /// The indentation size for the table cell contents.
    ///
    /// See [\[MS-ONE\] 2.2.2].
    ///
    /// [\[MS-ONE\] 2.2.2]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/269a3e7b-d85a-4ba8-8e1d-d85e1c840772
    pub fn outline_indent_distance(&self) -> &OutlineIndentDistance {
        &self.outline_indent_distance
    }

    /// The cell's background color.
    pub fn background_color(&self) -> Option<Color> {
        self.background_color
    }
}

pub(crate) fn parse_table(table_id: ExGuid, space: &ObjectSpace) -> Result<Table> {
    let table_object = space
        .get_object(table_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("table object is missing".into()))?;
    let data = table_node::parse(table_object)?;

    let contents = data
        .rows
        .into_iter()
        .map(|row_id| parse_row(row_id, space))
        .collect::<Result<_>>()?;

    let table = Table {
        rows: data.row_count,
        cols: data.col_count,
        contents,
        cols_locked: data.cols_locked,
        col_widths: data.col_widths,
        borders_visible: data.borders_visible,
        layout_alignment_in_parent: data.layout_alignment_in_parent,
        layout_alignment_self: data.layout_alignment_self,
        note_tags: parse_note_tags(data.note_tags, space)?,
    };

    Ok(table)
}

fn parse_row(row_id: ExGuid, space: &ObjectSpace) -> Result<TableRow> {
    let row_object = space
        .get_object(row_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("row object is missing".into()))?;
    let data = table_row_node::parse(row_object)?;

    let contents = data
        .cells
        .into_iter()
        .map(|cell_id| parse_cell(cell_id, space))
        .collect::<Result<_>>()?;

    let row = TableRow { contents };

    Ok(row)
}

fn parse_cell(cell_id: ExGuid, space: &ObjectSpace) -> Result<TableCell> {
    let cell_object = space
        .get_object(cell_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("cell object is missing".into()))?;
    let data = table_cell_node::parse(cell_object)?;

    let contents = data
        .contents
        .into_iter()
        .map(|element_id| parse_outline_element(element_id, space))
        .collect::<Result<_>>()?;

    let cell = TableCell {
        contents,
        background_color: data.background_color,
        layout_max_width: data.layout_max_width,
        outline_indent_distance: data.outline_indent_distance,
    };

    Ok(cell)
}
