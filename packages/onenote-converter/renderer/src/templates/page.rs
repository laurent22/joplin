use crate::utils::{StyleSet, html_entities};
use askama::Template;
use color_eyre::Result;
use color_eyre::eyre::WrapErr;
use itertools::Itertools;
use std::collections::HashMap;

pub(crate) struct PageTimestamps {
    pub(crate) created_time: i64,
    pub(crate) updated_time: i64,
}

#[derive(Template)]
#[template(path = "page.html", escape = "none")]
struct PageTemplate<'a> {
    page_id_attr: &'a str,
    created_date_attr: &'a str,
    updated_date_attr: &'a str,
    name: &'a str,
    content: &'a str,
    global_styles: Vec<(&'a String, &'a StyleSet)>,
}

pub(crate) fn render(
    page_id: &str,
    timestamps: &PageTimestamps,
    name: &str,
    content: &str,
    global_styles: &HashMap<String, StyleSet>,
) -> Result<String> {
    PageTemplate {
        content,
        name: &html_entities(name),
        page_id_attr: &html_entities(page_id),
        created_date_attr: &timestamps.created_time.to_string(),
        updated_date_attr: &timestamps.updated_time.to_string(),
        global_styles: global_styles
            .iter()
            .sorted_by(|(a, _), (b, _)| Ord::cmp(a, b))
            .collect(),
    }
    .render()
    .wrap_err("Failed to render page template")
}
