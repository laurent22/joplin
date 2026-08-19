use core::f32;

use crate::utils::{AttributeSet, StyleSet};
use itertools::Itertools;
use parser::contents::{Ink, InkBoundingBox, InkPoint, InkStroke};

type Vec2 = (f32, f32);

struct InkPart {
    content: String,

    /// Size of the ink
    content_size_px: Vec2,
    /// Size of the element containing the ink
    display_size_px: Vec2,
    /// x/y position of the element containing the ink
    offset_px: Vec2,
}

pub(crate) struct InkBuilder {
    parts: Vec<InkPart>,
    embedded: bool,
}

impl InkBuilder {
    const SVG_SCALING_FACTOR: f32 = 2540.0 / 96.0;

    pub(crate) fn new(embedded: bool) -> Self {
        Self {
            parts: vec![],
            embedded,
        }
    }

    fn reset(&mut self) {
        self.parts.clear();
    }

    pub(crate) fn push(&mut self, ink: &Ink, display_bounding_box: Option<&InkBoundingBox>) {
        let children = ink.child_groups();
        for child in children {
            self.push(child, ink.bounding_box().as_ref().or(display_bounding_box));
        }

        let strokes = ink.ink_strokes();
        if strokes.is_empty() {
            return;
        }

        let stroke_strength = strokes[0].width().max(strokes[0].height()).max(140.0);

        let offset_horizontal = ink
            .offset_horizontal()
            .filter(|_| !self.embedded)
            .unwrap_or_default();
        let offset_vertical = ink
            .offset_vertical()
            .filter(|_| !self.embedded)
            .unwrap_or_default();

        let display_bounding_box = ink
            .bounding_box()
            .or_else(|| display_bounding_box.map(|bb| bb.scale(Self::SVG_SCALING_FACTOR)))
            .filter(|_| self.embedded);

        let (x_min, width) = get_boundary(strokes, |p| p.x());
        let (y_min, height) = get_boundary(strokes, |p| p.y());

        let x_min = x_min - stroke_strength / 2.0;
        let y_min = y_min - stroke_strength / 2.0;

        let width = width + stroke_strength + Self::SVG_SCALING_FACTOR;
        let height = height + stroke_strength + Self::SVG_SCALING_FACTOR;

        let height_px = (height / (Self::SVG_SCALING_FACTOR)).ceil();
        let width_px = (width / (Self::SVG_SCALING_FACTOR)).ceil();

        // Use the ink's bounding box for width/height if larger. Inline ink relies on the preceding
        // ink having a specific size for correct positioning. Using the width_px/height_px of the actual content
        // often results in an incorrect bounding box and incorrectly-positioned ink.
        let display_size_px = if let Some(ink_bbox) = display_bounding_box {
            let display_width = ink_bbox.width() / Self::SVG_SCALING_FACTOR;
            let display_height = ink_bbox.height() / Self::SVG_SCALING_FACTOR;
            (display_width, display_height)
        } else {
            (width_px, height_px)
        };

        let display_y_min = display_bounding_box.map(|bb| bb.y()).unwrap_or_default();
        let display_x_min = display_bounding_box.map(|bb| bb.x()).unwrap_or_default();

        let top_px = (y_min - display_y_min) / Self::SVG_SCALING_FACTOR + offset_vertical * 48.0;
        let left_px = (x_min - display_x_min) / Self::SVG_SCALING_FACTOR + offset_horizontal * 48.0;

        let translate = (
            left_px * Self::SVG_SCALING_FACTOR - x_min,
            top_px * Self::SVG_SCALING_FACTOR - y_min,
        );
        let scale = 1. / Self::SVG_SCALING_FACTOR;
        let path = self.render_ink_path(strokes, scale, translate);
        self.parts.push(InkPart {
            content: path,
            content_size_px: (width_px, height_px),
            display_size_px,
            offset_px: (left_px, top_px),
        })
    }

    pub(crate) fn finish(&mut self) -> String {
        let result = self.build();
        self.reset();

        result
    }

    fn build(&self) -> String {
        if self.parts.is_empty() {
            return "".into();
        }

        let path = self.parts.iter().map(|part| &part.content).join("");

        let (offset, content_size, display_size) = {
            let mut offset = (f32::INFINITY, f32::INFINITY);
            let mut max_content = (f32::NEG_INFINITY, f32::NEG_INFINITY);
            let mut max_display = (f32::NEG_INFINITY, f32::NEG_INFINITY);

            for item in self.parts.iter() {
                let item_offset = item.offset_px;

                offset.0 = offset.0.min(item_offset.0);
                offset.1 = offset.1.min(item_offset.1);
                max_content.0 = max_content.0.max(item_offset.0 + item.content_size_px.0);
                max_content.1 = max_content.1.max(item_offset.1 + item.content_size_px.1);
                max_display.0 = max_display.0.max(item_offset.0 + item.display_size_px.0);
                max_display.1 = max_display.1.max(item_offset.1 + item.display_size_px.1);
            }

            let content_size = (max_content.0 - offset.0, max_content.1 - offset.1);
            let display_size = (max_display.0 - offset.0, max_display.1 - offset.1);

            (offset, content_size, display_size)
        };

        let offset = round_svg_vec(offset);
        let content_size = round_svg_vec(content_size);
        let display_size = round_svg_vec(display_size);

        let mut attrs = AttributeSet::new();
        attrs.set(
            "viewBox",
            format!(
                "{} {} {} {}",
                offset.0,
                offset.1,
                // Use content_size for the width/height to ensure that the full content
                // is visible.
                content_size.0,
                content_size.1
            ),
        );

        let mut styles = StyleSet::new();
        styles.set("position", "absolute".into());
        styles.set("left", format!("{}px", offset.0));
        styles.set("top", format!("{}px", offset.1));
        styles.set("width", format!("{}px", content_size.0));
        styles.set("height", format!("{}px", content_size.1));
        // Allow selecting text behind the ink:
        styles.set("pointer-events", "none".into());

        attrs.set("style", styles.to_string());

        if self.embedded {
            let mut span_styles = StyleSet::new();
            // Use display_size instead of content_size to size the container. This ensures that
            // embedded ink that comes after this ink has the correct position.
            span_styles.set("width", format!("{}px", display_size.0));
            span_styles.set("height", format!("{}px", display_size.1));

            format!(
                "<span style=\"{}\" class=\"ink-text\"><svg {}>{}</svg></span>",
                span_styles, attrs, path
            )
        } else {
            format!("<svg {}>{}</svg>", attrs, path)
        }
    }

    fn render_ink_path(&self, strokes: &[InkStroke], scale: f32, translate: Vec2) -> String {
        if strokes.is_empty() {
            return "".into();
        }

        let mut attrs = AttributeSet::new();

        attrs.set(
            "d",
            strokes
                .iter()
                .map(|stroke| self.render_ink_path_points(stroke, scale, translate))
                .collect_vec()
                .join(" "),
        );

        let stroke = &strokes[0];

        let opacity = (255 - stroke.transparency().unwrap_or_default()) as f32 / 256.0;
        attrs.set("opacity", format!("{:.2}", opacity));

        let color = if let Some(value) = stroke.color() {
            let r = value % 256;

            let rem = (value - r) / 256;
            let g = rem % 256;

            let rem = (rem - g) / 256;
            let b = rem % 256;

            format!("rgb({}, {}, {})", r, g, b)
        } else {
            "WindowText".to_string()
        };
        attrs.set("stroke", color);

        attrs.set("stroke-width", (stroke.width() * scale).round().to_string());

        let pen_type = stroke.pen_tip().unwrap_or_default();
        attrs.set(
            "stroke-linejoin",
            if pen_type == 0 { "round" } else { "bevel" }.to_string(),
        );
        attrs.set(
            "stroke-linecap",
            if pen_type == 0 { "round" } else { "square" }.to_string(),
        );

        attrs.set("fill", "none".to_string());

        format!("<path {} />", attrs)
    }

    fn render_ink_path_points(&self, stroke: &InkStroke, scale: f32, translate: Vec2) -> String {
        let path = stroke.path();
        if path.is_empty() {
            return "".into();
        }

        let display_point = |p: &InkPoint| -> String {
            let x = p.x() * scale;
            let y = p.y() * scale;
            format!("{} {}", round_svg_value(x), round_svg_value(y))
        };

        let start = &path[0];
        let mut path = path[1..].iter().map(display_point).collect_vec();

        if path.is_empty() {
            path.push("0 0".to_string());
        }

        let offset_x = ((start.x() + translate.0) * scale).floor();
        let offset_y = ((start.y() + translate.1) * scale).floor();

        format!("M {} {} l {}", offset_x, offset_y, path.join(" "))
    }
}

fn get_boundary<F: Fn(&InkPoint) -> f32>(strokes: &[InkStroke], coord: F) -> (f32, f32) {
    if strokes.is_empty() {
        return (0.0, 0.0);
    }

    let mut min = f32::INFINITY;
    let mut max = f32::NEG_INFINITY;

    for stroke in strokes {
        let path = stroke.path();
        if path.is_empty() {
            continue;
        }

        let start = coord(&path[0]);

        let mut pos = start;
        if pos < min {
            min = pos;
        }
        if pos > max {
            max = pos;
        }

        for point in path[1..].iter() {
            pos += coord(point);

            if pos < min {
                min = pos;
            }
            if pos > max {
                max = pos;
            }
        }
    }

    (min, max - min)
}

fn round_svg_vec(v: Vec2) -> Vec2 {
    (round_svg_value(v.0), round_svg_value(v.1))
}

fn round_svg_value(x: f32) -> f32 {
    (x * 100.).round() / 100.
}
