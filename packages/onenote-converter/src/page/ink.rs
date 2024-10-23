use crate::page::Renderer;
use crate::parser::contents::{Ink, InkBoundingBox, InkPoint, InkStroke};
use crate::utils::{px, AttributeSet, StyleSet};
use itertools::Itertools;

impl<'a> Renderer<'a> {
    const SVG_SCALING_FACTOR: f32 = 2540.0 / 96.0;

    pub(crate) fn render_ink(
        &mut self,
        ink: &Ink,
        display_bounding_box: Option<&InkBoundingBox>,
        embedded: bool,
    ) -> String {
        if ink.ink_strokes().is_empty() {
            return String::new();
        }

        let mut attrs = AttributeSet::new();
        let mut styles = StyleSet::new();

        styles.set("overflow", "visible".to_string());
        styles.set("position", "absolute".to_string());

        let path = self.render_ink_path(ink.ink_strokes());

        let offset_horizontal = ink
            .offset_horizontal()
            .filter(|_| !embedded)
            .unwrap_or_default();
        let offset_vertical = ink
            .offset_vertical()
            .filter(|_| !embedded)
            .unwrap_or_default();

        let display_bounding_box = ink
            .bounding_box()
            .or_else(|| display_bounding_box.map(|bb| bb.scale(Self::SVG_SCALING_FACTOR)))
            .filter(|_| embedded);

        let (x_min, width) = get_boundary(ink.ink_strokes(), |p| p.x());
        let (y_min, height) = get_boundary(ink.ink_strokes(), |p| p.y());

        let stroke_strength = ink.ink_strokes()[0]
            .width()
            .max(ink.ink_strokes()[0].height())
            .max(140.0);

        let x_min = x_min as f32 - stroke_strength / 2.0;
        let y_min = y_min as f32 - stroke_strength / 2.0;

        let width = width as f32 + stroke_strength + Self::SVG_SCALING_FACTOR;
        let height = height as f32 + stroke_strength + Self::SVG_SCALING_FACTOR;

        styles.set(
            "height",
            format!(
                "{}px",
                ((height as f32) / (Self::SVG_SCALING_FACTOR)).round()
            ),
        );
        styles.set(
            "width",
            format!(
                "{}px",
                ((width as f32) / (Self::SVG_SCALING_FACTOR)).round()
            ),
        );

        let display_y_min = display_bounding_box.map(|bb| bb.y()).unwrap_or_default();
        let display_x_min = display_bounding_box.map(|bb| bb.x()).unwrap_or_default();

        styles.set(
            "top",
            format!(
                "{}px",
                ((y_min - display_y_min) / Self::SVG_SCALING_FACTOR + offset_vertical * 48.0)
                    .round()
            ),
        );
        styles.set(
            "left",
            format!(
                "{}px",
                ((x_min - display_x_min) / Self::SVG_SCALING_FACTOR + offset_horizontal * 48.0)
                    .round()
            ),
        );

        attrs.set(
            "viewBox",
            format!(
                "{} {} {} {}",
                x_min.round(),
                y_min.round(),
                width.round(),
                height.round()
            ),
        );

        if styles.len() > 0 {
            attrs.set("style", styles.to_string());
        }

        if embedded {
            let mut span_styles = StyleSet::new();

            if let Some(bb) = display_bounding_box {
                span_styles.set("width", px(bb.width() / Self::SVG_SCALING_FACTOR / 48.0));
                span_styles.set("height", px(bb.height() / Self::SVG_SCALING_FACTOR / 48.0));
            }

            format!(
                "<span style=\"{}\" class=\"ink-text\"><svg {}>{}</svg></span>",
                span_styles.to_string(),
                attrs.to_string(),
                path
            )
        } else {
            format!("<svg {}>{}</svg>", attrs.to_string(), path)
        }
    }

    fn render_ink_path(&mut self, strokes: &[InkStroke]) -> String {
        let mut attrs = AttributeSet::new();

        attrs.set(
            "d",
            strokes
                .iter()
                .map(|stroke| self.render_ink_path_points(stroke))
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

        attrs.set("stroke-width", stroke.width().round().to_string());

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

        format!("<path {} />", attrs.to_string())
    }

    fn render_ink_path_points(&self, stroke: &InkStroke) -> String {
        let start = &stroke.path()[0];
        let mut path = stroke.path()[1..].iter().map(display_point).collect_vec();

        if path.is_empty() {
            path.push("0 0".to_string());
        }

        format!("M {} l {}", display_point(start), path.join(" "))
    }
}

fn get_boundary<F: Fn(&InkPoint) -> f32>(strokes: &[InkStroke], coord: F) -> (f32, f32) {
    let mut min = f32::INFINITY;
    let mut max = f32::NEG_INFINITY;

    for stroke in strokes {
        let start = coord(&stroke.path()[0]);
        let mut pos = start;

        for point in stroke.path()[1..].iter() {
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

fn display_point(p: &InkPoint) -> String {
    format!("{} {}", p.x().floor(), p.y().round())
}
