use crate::notebook::RgbColor;
use askama::Template;
use color_eyre::eyre::WrapErr;
use color_eyre::Result;

#[derive(Template)]
#[template(path = "notebook.html")]
struct NotebookTemplate<'a> {
    name: &'a str,
    toc: &'a [Toc],
    _bool: fn(&bool) -> bool,
}

pub(crate) enum Toc {
    Section(Section),
    SectionGroup(String, Vec<Section>),
}

#[derive(Debug)]
pub(crate) struct Section {
    pub(crate) name: String,
    pub(crate) path: String,
    pub(crate) color: Option<RgbColor>,
}

pub(crate) fn render(name: &str, toc: &[Toc]) -> Result<String> {
    let template = NotebookTemplate { name, toc, _bool };

    template
        .render()
        .wrap_err("Failed to render notebook template")
}

fn _bool(b: &bool) -> bool {
    *b
}

mod filters {
    pub(crate) use crate::templates::url_encode as encode;
}
