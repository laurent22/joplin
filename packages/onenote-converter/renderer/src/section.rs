use crate::errors::{ErrorKind, Result};
use crate::templates::section::TocEntry;
use crate::{page, templates};
use parser::page::Page;
use parser::section::Section;
use parser_utils::fs_driver;
use parser_utils::log;
use parser_utils::log_warn;
use std::collections::HashSet;

pub(crate) struct Renderer {
    pub(crate) files: HashSet<String>,
}

pub(crate) struct RenderedSection {
    pub(crate) section_dir: String,
}

const ERRORS_NOTE_NAME: &str = "⚠️ Errors ⚠️";

impl Renderer {
    pub fn new() -> Self {
        Renderer {
            files: Default::default(),
        }
    }

    pub fn render(&mut self, section: &Section, output_dir: String) -> Result<RenderedSection> {
        let section_dir = fs_driver().join(
            output_dir.as_str(),
            sanitize_filename::sanitize(section.display_name()).as_str(),
        );
        log!(
            "section_dir: {:?} \n output_dir: {:?}",
            section_dir,
            output_dir
        );

        log!("Rendering section: {:?}", section_dir);
        fs_driver().make_dir(section_dir.as_str())?;

        let mut toc = Vec::new();
        let mut fallback_title_index = 0;
        let mut errors: Vec<String> = Vec::new();

        for page_series in section.page_series() {
            let page_errors = page_series.errors();
            for error in page_errors {
                log_warn!("Page failed to parse: {:?}", error);
                errors.push(format!("Parse error: {:?}", error));
            }

            for page in page_series.pages() {
                let render_result =
                    self.render_page_to_file(page, &section_dir, &output_dir, || {
                        fallback_title_index += 1;
                        fallback_title_index
                    });
                match render_result {
                    Ok(toc_entry) => {
                        toc.push(toc_entry);
                    }
                    Err(error) => {
                        log_warn!("Error rendering page: {:?}", error);
                        let title = page.title_text().unwrap_or_default();
                        errors.push(format!("Render error for page {}: {:?}", title, error));
                    }
                }
            }
        }

        let errors_path = if !errors.is_empty() {
            let error_toc_entry = self.render_errors_to_file(&errors, &output_dir)?;
            let errors_path = fs_driver().join(&output_dir, &error_toc_entry.relative_path);
            toc.push(error_toc_entry);

            Some(errors_path)
        } else {
            None
        };

        let toc_html = templates::section::render(section.display_name(), toc)?;
        let toc_path = self.write_html_file(&output_dir, section.display_name(), &toc_html)?;
        log!("ToC: {}", toc_path);

        if errors_path.is_some() {
            Err(ErrorKind::RenderFailed(format!(
                "Some pages failed to render. First error: {:?}. Full error report written to {}",
                errors.first(),
                ERRORS_NOTE_NAME,
            ))
            .into())
        } else {
            Ok(RenderedSection { section_dir })
        }
    }

    fn render_page_to_file<F>(
        &mut self,
        page: &Page,
        section_dir: &str,
        output_dir: &str,
        fallback_title_idx: F,
    ) -> Result<TocEntry>
    where
        F: FnOnce() -> u32,
    {
        let title = page
            .title_text()
            .map(|s| s.to_string())
            .unwrap_or_else(|| format!("Untitled Page {}", fallback_title_idx()));

        let mut renderer = page::Renderer::new(section_dir.into(), self);
        let page_html = renderer.render_page(page)?;

        let page_path = self.write_html_file(section_dir, &title, &page_html)?;
        log!("Created page file: {:?}", page_path);

        let page_path_without_basedir =
            String::from(fs_driver().remove_prefix(&page_path, output_dir));
        Ok(TocEntry {
            name: title,
            is_error: false,
            relative_path: page_path_without_basedir,
            level: page.level(),
        })
    }

    fn render_errors_to_file(
        &mut self,
        errors: &Vec<String>,
        output_dir: &str,
    ) -> Result<TocEntry> {
        let error_html = templates::errors::render(&errors)?;
        let errors_path = self.write_html_file(&output_dir, "Errors", &error_html)?;
        log!("Errors: {}", errors_path);

        Ok(TocEntry {
            level: 1,
            is_error: true,
            name: ERRORS_NOTE_NAME.into(),
            relative_path: fs_driver().remove_prefix(&errors_path, &output_dir).into(),
        })
    }

    fn write_html_file(&mut self, parent_dir: &str, title: &str, html: &str) -> Result<String> {
        let filename = self.title_to_unique_safe_filename(parent_dir, title, ".html")?;
        let path = fs_driver().join(&parent_dir, &filename);
        fs_driver().write_file(&path, html.as_bytes())?;
        Ok(path)
    }

    pub(crate) fn to_unique_safe_filename(
        &mut self,
        parent_dir: &str,
        filename: &str,
    ) -> Result<String> {
        let (base, ext) = fs_driver().split_file_name(filename);
        self.title_to_unique_safe_filename(parent_dir, &base, &ext)
    }

    fn title_to_unique_safe_filename(
        &mut self,
        parent_dir: &str,
        filename_base: &str,
        extension: &str,
    ) -> Result<String> {
        let filename = filename_base.trim().replace("/", "_");
        let mut i = 0;
        let mut current_filename =
            sanitize_filename::sanitize(format!("{}{}", filename, extension));

        loop {
            let current_full_path = fs_driver().join(parent_dir, &current_filename);
            if !self.files.contains(&current_full_path) {
                self.files.insert(current_full_path);
                break;
            }

            i += 1;
            current_filename =
                sanitize_filename::sanitize(format!("{}_{}{}", filename, i, extension));
        }

        Ok(current_filename)
    }
}
