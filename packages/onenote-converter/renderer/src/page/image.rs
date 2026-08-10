use std::io::{Cursor, Read};

use crate::page::Renderer;
use crate::utils::{detect_png, px, AttributeSet, StyleSet};
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
            let is_xps_printout_with_pdf_extension_detected =
                is_xps_printout_with_pdf_extension(image, &image_start_bytes);

            let (filename, should_write) =
                self.determine_image_filename(image, &image_start_bytes)?;
            let path = fs_driver().join(&self.output, &filename);

            if should_write {
                log!("Rendering image: {:?}", path);

                let mut reader = Cursor::new(image_start_bytes).chain(reader);
                fs_driver().stream_to_file(&path, &mut reader)?;
            } else {
                log!("Reusing image: {:?}", path);
            }

            let mut attrs = AttributeSet::new();
            let mut styles = StyleSet::new();

            attrs.set("src", filename);

            if is_xps_printout(image) || is_xps_printout_with_pdf_extension_detected {
                if let Some(page_number) = image.displayed_page_number() {
                    attrs.set("data-onenote-page-number", page_number.to_string());
                }
            }

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

    fn determine_image_filename(
        &mut self,
        image: &Image,
        initial_bytes: &[u8],
    ) -> Result<(String, bool)> {
        if let Some(name) = image.image_filename() {
            if is_reusable_image_filename(name) {
                let filename = fs_driver().sanitize_file_name(name);
                let path = fs_driver().join(&self.output, &filename);
                return Ok((filename, !fs_driver().exists(&path)?));
            }

            if is_xps_printout_with_pdf_extension(image, initial_bytes) {
                let (base_name, _) = fs_driver().split_file_name(name);
                let name = format!("{base_name}.xps");
                let filename = fs_driver().sanitize_file_name(&name);
                let path = fs_driver().join(&self.output, &filename);
                return Ok((filename, !fs_driver().exists(&path)?));
            }

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
            return Ok((filename, true));
        }

        let ext = image.extension().unwrap_or_else(|| {
            log_warn!("Image missing extension. Defaulting to .png.");
            ".png"
        });
        let filename = self
            .section
            .to_unique_safe_filename(&self.output, &format!("image{}", ext))?;
        Ok((filename, true))
    }
}

fn is_reusable_image_filename(filename: &str) -> bool {
    let extension = fs_driver().get_file_extension(filename);
    extension.eq_ignore_ascii_case(".xps") || extension.eq_ignore_ascii_case(".oxps")
}

fn is_xps_printout(image: &Image) -> bool {
    image
        .image_filename()
        .map(is_reusable_image_filename)
        .unwrap_or(false)
}

fn is_xps_printout_with_pdf_extension(image: &Image, initial_bytes: &[u8]) -> bool {
    // Get the file name from the OneNote image.
    let Some(filename) = image.image_filename() else {
        // If there is no file name, this cannot be an XPS printout.
        return false;
    };
    // Get the file extension, for example ".pdf".
    let extension = fs_driver().get_file_extension(filename);

    // The image must point to one page of a multi-page printout.
    image.displayed_page_number().is_some()
        // The file name must say that this is a PDF.
        && extension.eq_ignore_ascii_case(".pdf")
        // The real file starts like a ZIP package, which XPS files use.
        && initial_bytes.starts_with(b"PK")
        // A real PDF starts with "%PDF", so do not treat real PDFs as XPS.
        && !initial_bytes.starts_with(b"%PDF")
}

fn read_file_start(reader: &mut Box<dyn Read>) -> Result<Vec<u8>> {
    let size: usize = 1024;
    let mut sub_reader = reader.by_ref().take(size as u64);
    let mut bytes = Vec::with_capacity(size);
    sub_reader.read_to_end(&mut bytes)?;
    Ok(bytes)
}
