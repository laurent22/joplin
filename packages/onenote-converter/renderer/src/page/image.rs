use std::io::{Cursor, Read};

use crate::page::Renderer;
use crate::utils::{AttributeSet, StyleSet, detect_png, px};
use color_eyre::Result;
use parser::contents::Image;
use parser_utils::{fs_driver, log, log_warn};

impl<'a> Renderer<'a> {
    pub(crate) fn render_image(&mut self, image: &Image) -> Result<String> {
        let mut content = String::new();

        if let Some(mut reader) = image.read()? {
            // Read up to the first kilobyte so that determine_image_filename can do
            // file type detection
            let image_start_bytes = read_file_start(&mut reader)?;

            let filename = self.determine_image_filename(image, &image_start_bytes)?;
            let path = fs_driver().join(&self.output, &filename);
            log!("Rendering image: {:?}", path);

            // Rebuild the reader so that the image start bytes are included in the file
            let mut reader = Cursor::new(image_start_bytes).chain(reader);
            fs_driver().stream_to_file(&path, &mut reader)?;

            let mut attrs = AttributeSet::new();
            let mut styles = StyleSet::new();

            attrs.set("src", filename);

            if let Some(text) = image.alt_text() {
                attrs.set("alt", text.to_string());
            }

            if let Some(width) = image.layout_max_width() {
                styles.set("max-width", px(width));
            }

            if let Some(height) = image.layout_max_height() {
                styles.set("max-height", px(height));
            }

            if image.offset_horizontal().is_some() || image.offset_vertical().is_some() {
                styles.set("position", "absolute".to_string());
            }

            if let Some(offset) = image.offset_horizontal() {
                styles.set("left", px(offset));
            }

            if let Some(offset) = image.offset_vertical() {
                styles.set("top", px(offset));
            }

            if styles.len() > 0 {
                attrs.set("style", styles.to_string());
            }

            content.push_str(&format!("<img {} />", attrs));
        }

        Ok(self.render_with_note_tags(image.note_tags(), content))
    }

    fn determine_image_filename(&mut self, image: &Image, initial_bytes: &[u8]) -> Result<String> {
        if let Some(name) = image.image_filename() {
            // Workaround: PDF printout pages are PNG images, but have an image_filename with extension .PDF.
            // Add a PNG extension to these files so that they are imported properly:
            let name = {
                let is_pdf = fs_driver()
                    .get_file_extension(name)
                    .eq_ignore_ascii_case(".pdf");
                if is_pdf && detect_png(initial_bytes) {
                    format!("{name}.png")
                } else {
                    name.to_string()
                }
            };

            let filename = self.section.to_unique_safe_filename(&self.output, &name)?;
            return Ok(filename);
        }

        let ext = image.extension().unwrap_or_else(|| {
            log_warn!("Image missing extension. Defaulting to .png.");
            ".png"
        });
        let filename = self
            .section
            .to_unique_safe_filename(&self.output, &format!("image{}", ext))?;
        Ok(filename)
    }
}

fn read_file_start(reader: &mut Box<dyn Read>) -> Result<Vec<u8>> {
    let size: usize = 1024;
    let mut sub_reader = reader.by_ref().take(size as u64);
    let mut bytes = Vec::with_capacity(size);
    sub_reader.read_to_end(&mut bytes)?;
    Ok(bytes)
}
