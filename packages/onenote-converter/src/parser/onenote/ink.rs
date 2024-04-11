use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property_set::{
    ink_container, ink_data_node, ink_stroke_node, stroke_properties_node,
};
use crate::parser::onestore::object_space::ObjectSpace;

/// An ink object.
#[derive(Clone, Debug)]
pub struct Ink {
    pub(crate) ink_strokes: Vec<InkStroke>,
    pub(crate) bounding_box: Option<InkBoundingBox>,

    pub(crate) offset_horizontal: Option<f32>,
    pub(crate) offset_vertical: Option<f32>,
}

impl Ink {
    /// The ink strokes contained in this ink object.
    pub fn ink_strokes(&self) -> &[InkStroke] {
        &self.ink_strokes
    }

    /// The ink object's bounding box.
    pub fn bounding_box(&self) -> Option<InkBoundingBox> {
        self.bounding_box
    }

    /// The horizontal offset from the page origin in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.18].
    ///
    /// [\[MS-ONE\] 2.3.18]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/5fb9e84a-c9e9-4537-ab14-e5512f24669a
    pub fn offset_horizontal(&self) -> Option<f32> {
        self.offset_horizontal
    }

    /// The vertical offset from the page origin in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.19].
    ///
    /// [\[MS-ONE\] 2.3.19]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/5c4992ba-1db5-43e9-83dd-7299c562104d
    pub fn offset_vertical(&self) -> Option<f32> {
        self.offset_vertical
    }
}

/// An ink stroke.
#[derive(Clone, Debug)]
pub struct InkStroke {
    pub(crate) path: Vec<InkPoint>,
    pub(crate) pen_tip: Option<u8>,
    pub(crate) transparency: Option<u8>,
    pub(crate) height: f32,
    pub(crate) width: f32,
    pub(crate) color: Option<u32>,
}

impl InkStroke {
    /// The ink stroke's path.
    pub fn path(&self) -> &[InkPoint] {
        &self.path
    }

    /// The pen tip used for the ink path.
    ///
    /// The exact meaning is not specified.
    pub fn pen_tip(&self) -> Option<u8> {
        self.pen_tip
    }

    /// The path's transparency
    ///
    /// The exact meaning is not specified. It seems like 0 means translucent and 255 means opaque.
    pub fn transparency(&self) -> Option<u8> {
        self.transparency
    }

    /// The ink stroke's total height.
    pub fn height(&self) -> f32 {
        self.height
    }

    /// The ink stroke's total width.
    ///
    /// The exact meaning is not specified.
    pub fn width(&self) -> f32 {
        self.width
    }

    /// The ink stroke's color.
    ///
    /// The exact meaning is not specified.
    pub fn color(&self) -> Option<u32> {
        self.color
    }
}

/// A point in an ink path.
#[derive(Copy, Clone, PartialEq, PartialOrd, Debug)]
pub struct InkPoint {
    pub(crate) x: f32,
    pub(crate) y: f32,
}

impl InkPoint {
    /// The point's X coordinates.
    pub fn x(&self) -> f32 {
        self.x
    }

    /// The point's Y coordinates.
    pub fn y(&self) -> f32 {
        self.y
    }
}

/// The bounding box of an ink object.
#[derive(Clone, Copy, Debug)]
pub struct InkBoundingBox {
    pub(crate) x: f32,
    pub(crate) y: f32,
    pub(crate) height: f32,
    pub(crate) width: f32,
}

impl InkBoundingBox {
    /// The initial X coordinate of the bounding box.
    ///
    /// The exact meaning and unit are not specified.
    pub fn x(&self) -> f32 {
        self.x
    }

    /// The initial Y coordinate of the bounding box.
    ///
    /// The exact meaning and unit are not specified.
    pub fn y(&self) -> f32 {
        self.y
    }

    /// The height of the bounding box.
    ///
    /// The exact meaning and unit are not specified.
    pub fn height(&self) -> f32 {
        self.height
    }

    /// The width of the bounding box.
    ///
    /// The exact meaning and unit are not specified.
    pub fn width(&self) -> f32 {
        self.width
    }

    /// Scale the bounding box by a constant factor.
    pub fn scale(&self, factor: f32) -> InkBoundingBox {
        InkBoundingBox {
            x: self.x * factor,
            y: self.y * factor,
            height: self.height * factor,
            width: self.width * factor,
        }
    }
}

pub(crate) fn parse_ink(ink_container_id: ExGuid, space: &ObjectSpace) -> Result<Ink> {
    let container_object = space
        .get_object(ink_container_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("ink container is missing".into()))?;
    let container = ink_container::parse(container_object)?;

    let ink_data_id = match container.ink_data {
        Some(id) => id,
        None => {
            return Ok(Ink {
                ink_strokes: vec![],
                bounding_box: None,
                offset_horizontal: container.offset_from_parent_horiz,
                offset_vertical: container.offset_from_parent_vert,
            })
        }
    };

    let (ink_strokes, bounding_box) = parse_ink_data(
        ink_data_id,
        space,
        container.ink_scaling_x,
        container.ink_scaling_y,
    )?;

    Ok(Ink {
        ink_strokes,
        bounding_box,
        offset_horizontal: container.offset_from_parent_horiz,
        offset_vertical: container.offset_from_parent_vert,
    })
}

pub(crate) fn parse_ink_data(
    ink_data_id: ExGuid,
    space: &ObjectSpace,
    scale_x: Option<f32>,
    scale_y: Option<f32>,
) -> Result<(Vec<InkStroke>, Option<InkBoundingBox>)> {
    let ink_data_object = space
        .get_object(ink_data_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("ink data node is missing".into()))?;
    let ink_data = ink_data_node::parse(ink_data_object)?;

    let strokes = ink_data
        .strokes
        .iter()
        .copied()
        .map(|ink_stroke_id| parse_ink_stroke(ink_stroke_id, space, scale_x, scale_y))
        .collect::<Result<_>>()?;

    let scale_x = scale_x.unwrap_or(1.0);
    let scale_y = scale_y.unwrap_or(1.0);

    let bounding_box = ink_data
        .bounding_box
        .map(|[x_min, y_min, x_max, y_max]| InkBoundingBox {
            x: x_min as f32 * scale_x,
            y: y_min as f32 * scale_y,
            width: (x_max as f32 - x_min as f32) * scale_x,
            height: (y_max as f32 - y_min as f32) * scale_y,
        });

    Ok((strokes, bounding_box))
}

fn parse_ink_stroke(
    ink_stroke_id: ExGuid,
    space: &ObjectSpace,
    scale_x: Option<f32>,
    scale_y: Option<f32>,
) -> Result<InkStroke> {
    let object = space
        .get_object(ink_stroke_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("ink stroke node is missing".into()))?;
    let data = ink_stroke_node::parse(object)?;

    let props_object = space.get_object(data.properties).ok_or_else(|| {
        ErrorKind::MalformedOneNoteData("ink stroke properties node is missing".into())
    })?;
    let props = stroke_properties_node::parse(props_object)?;

    let path = parse_ink_path(data.path, &props, scale_x, scale_y)?;

    Ok(InkStroke {
        path,
        pen_tip: props.pen_tip,
        transparency: props.transparency,
        height: props.ink_height,
        width: props.ink_width,
        color: props.color,
    })
}

fn parse_ink_path(
    data: Vec<i64>,
    props: &stroke_properties_node::Data,
    scale_x: Option<f32>,
    scale_y: Option<f32>,
) -> Result<Vec<InkPoint>> {
    // Find dimension indexes
    let idx_x = props
        .dimensions
        .iter()
        .position(|d| d.id == guid!({ 598a6a8f - 52c0 - 4ba0 - 93af - af357411a561 }))
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteData("ink stroke properties has no x dimension".into())
        })?;
    let idx_y = props
        .dimensions
        .iter()
        .position(|d| d.id == guid!({ b53f9f75 - 04e0 - 4498 - a7ee - c30dbb5a9011 }))
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteData("ink stroke properties has no y dimension".into())
        })?;

    // Find dimensions data
    let dimension_offset = data.len() / props.dimensions.len();

    let start_x = dimension_offset * idx_x;
    let start_y = dimension_offset * idx_y;

    let x = &data[start_x..start_x + dimension_offset];
    let y = &data[start_y..start_y + dimension_offset];

    let scale_x = scale_x.unwrap_or(1.0);
    let scale_y = scale_y.unwrap_or(1.0);

    let path = x
        .iter()
        .copied()
        .zip(y.iter().copied())
        .map(|(x, y)| InkPoint {
            x: scale_x * x as f32,
            y: scale_y * y as f32,
        })
        .collect();

    Ok(path)
}
