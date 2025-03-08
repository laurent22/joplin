use crate::parser::page::{Page, PageContent};
use crate::section;
use crate::utils::StyleSet;
use color_eyre::Result;
use std::collections::{HashMap, HashSet};

pub(crate) mod content;
pub(crate) mod embedded_file;
pub(crate) mod image;
pub(crate) mod ink;
pub(crate) mod list;
pub(crate) mod note_tag;
pub(crate) mod outline;
pub(crate) mod rich_text;
pub(crate) mod table;

pub(crate) struct Renderer<'a> {
    output: String,
    section: &'a mut section::Renderer,

    in_list: bool,
    global_styles: HashMap<String, StyleSet>,
    global_classes: HashSet<String>,
}

impl<'a> Renderer<'a> {
    pub(crate) fn new(output: String, section: &'a mut section::Renderer) -> Self {
        Self {
            output,
            section,
            in_list: false,
            global_styles: HashMap::new(),
            global_classes: HashSet::new(),
        }
    }

    pub(crate) fn render_page(&mut self, page: &Page) -> Result<String> {
        let title_text = page.title_text().unwrap_or("Untitled Page".to_string());

        let mut content = String::new();

        if let Some(title) = page.title() {
            let mut styles = StyleSet::new();
            styles.set("position", "absolute".to_string());
            styles.set(
                "top",
                format!("{}px", (title.offset_vertical() * 48.0 + 24.0).round()),
            );
            styles.set(
                "left",
                format!("{}px", (title.offset_horizontal() * 48.0 + 48.0).round()),
            );

            let mut title_field = format!("<div class=\"title\" style=\"{}\">", styles.to_string());

            for outline in title.contents() {
                title_field.push_str(&self.render_outline(outline)?)
            }

            title_field.push_str("</div>");

            content.push_str(&title_field);
        }

        let page_content = page
            .contents()
            .iter()
            .map(|content| self.render_page_content(content))
            .collect::<Result<String>>()?;

        content.push_str(&page_content);

        crate::templates::page::render(&title_text, &content, &self.global_styles)
    }

    pub(crate) fn gen_class(&mut self, prefix: &str) -> String {
        let mut i = 0;

        loop {
            let class = format!("{}-{}", prefix, i);
            if !self.global_classes.contains(&class) {
                self.global_classes.insert(class.clone());

                return class;
            }

            i += 1;
        }
    }

    fn render_page_content(&mut self, content: &PageContent) -> Result<String> {
        match content {
            PageContent::Outline(outline) => self.render_outline(outline),
            PageContent::Image(image) => self.render_image(image),
            PageContent::EmbeddedFile(file) => self.render_embedded_file(file),
            PageContent::Ink(ink) => Ok(self.render_ink(ink, None, false)),
            PageContent::Unknown => Ok(String::new()),
        }
    }
}
