use crate::page::Renderer;
use crate::parser::contents::{Outline, OutlineElement, OutlineItem};
use crate::utils::{px, AttributeSet, StyleSet};
use color_eyre::Result;

impl<'a> Renderer<'a> {
    pub(crate) fn render_outline(&mut self, outline: &Outline) -> Result<String> {
        let mut attrs = AttributeSet::new();
        let mut styles = StyleSet::new();
        let mut contents = String::new();

        attrs.set("class", "container-outline".to_string());

        if let Some(width) = outline.layout_max_width() {
            let outline_width = if outline.is_layout_size_set_by_user() {
                width
            } else {
                width.max(13.0)
            };

            styles.set("width", px(outline_width));
        };

        if outline.offset_horizontal().is_some() || outline.offset_vertical().is_some() {
            styles.set("position", "absolute".to_string());
        }

        if let Some(offset) = outline.offset_horizontal() {
            styles.set("left", px(offset));
        }

        if let Some(offset) = outline.offset_vertical() {
            styles.set("top", px(offset));
        }

        if styles.len() > 0 {
            attrs.set("style", styles.to_string());
        }

        contents.push_str(&format!("<div {}>", attrs));
        contents.push_str(&self.render_outline_items(
            outline.items(),
            0,
            outline.child_level(),
            outline.indents(),
        )?);
        contents.push_str("</div>");

        Ok(contents)
    }

    pub(crate) fn render_outline_items(
        &mut self,
        items: &[OutlineItem],
        parent_level: u8,
        current_level: u8,
        indents: &[f32],
    ) -> Result<String> {
        self.render_list(
            flatten_outline_items(items, parent_level, current_level),
            indents,
        )
    }

    pub(crate) fn render_outline_element(
        &mut self,
        element: &OutlineElement,
        parent_level: u8,
        current_level: u8,
        indents: &[f32],
    ) -> Result<String> {
        let mut indent_width = 0.0;
        for i in (parent_level + 1)..=current_level {
            indent_width += indents.get(i as usize).copied().unwrap_or(0.75);
        }

        let mut contents = String::new();
        let is_list = self.is_list(element);

        let mut attrs = AttributeSet::new();
        attrs.set("class", "outline-element".to_string());

        let mut styles = StyleSet::new();
        styles.set("margin-left", px(indent_width as f32));
        attrs.set("style", styles.to_string());

        if is_list {
            contents.push_str(&format!("<li {}>", attrs));
        } else {
            contents.push_str(&format!("<div {}>", attrs));
        }

        self.in_list = is_list;

        contents.extend(
            element
                .contents()
                .iter()
                .map(|content| self.render_content(content))
                .collect::<Result<Vec<_>, _>>()?
                .into_iter(),
        );

        self.in_list = false;

        if !is_list {
            contents.push_str("</div>");
        }

        let children = element.children();

        if !children.is_empty() {
            contents.push_str(&self.render_outline_items(
                children,
                current_level,
                current_level + element.child_level(),
                indents,
            )?);
        }

        if is_list {
            contents.push_str("</li>");
        }

        contents.push('\n');

        Ok(contents)
    }
}

fn flatten_outline_items<'a>(
    items: &'a [OutlineItem],
    parent_level: u8,
    current_level: u8,
) -> Box<dyn Iterator<Item = (&'a OutlineElement, u8, u8)> + 'a> {
    Box::new(items.iter().flat_map(move |item| match item {
        OutlineItem::Element(element) => {
            Box::new(Some((element, parent_level, current_level)).into_iter())
        }
        OutlineItem::Group(group) => flatten_outline_items(
            group.outlines(),
            parent_level,
            current_level + group.child_level(),
        ),
    }))
}
