use crate::page::Renderer;
use color_eyre::Result;
use log::warn;
// use crate::something_else::contents::Content;
use crate::parser::contents::Content;

impl<'a> Renderer<'a> {
    pub(crate) fn render_content(&mut self, content: &Content) -> Result<String> {
        match content {
            Content::RichText(text) => self.render_rich_text(text),
            Content::Image(image) => self.render_image(image),
            Content::EmbeddedFile(file) => self.render_embedded_file(file),
            Content::Table(table) => self.render_table(table),
            Content::Ink(ink) => Ok(self.render_ink(ink, None, false)),
            Content::Unknown => {
                warn!("Page with unknown content");

                Ok(String::new())
            }
        }
    }
}
