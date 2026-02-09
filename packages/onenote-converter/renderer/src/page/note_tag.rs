use crate::page::Renderer;
use crate::utils::{AttributeSet, StyleSet};
use parser::contents::{NoteTag, OutlineElement};
use parser::property::common::ColorRef;
use parser::property::note_tag::{ActionItemStatus, NoteTagShape};
use parser_utils::log_warn;
use std::borrow::Cow;

const COLOR_BLUE: &str = "#4673b7";
const COLOR_GREEN: &str = "#369950";
const COLOR_ORANGE: &str = "#dba24d";
const COLOR_PINK: &str = "#f78b9d";
const COLOR_RED: &str = "#db5b4d";
const COLOR_YELLOW: &str = "#ffd678";

const ICON_ARROW_RIGHT: &str = include_str!("../../assets/icons/arrow-right-line.svg");
const ICON_AWARD: &str = include_str!("../../assets/icons/award-line.svg");
const ICON_BOOK: &str = include_str!("../../assets/icons/book-open-line.svg");
const ICON_BUBBLE: &str = include_str!("../../assets/icons/chat-4-line.svg");
const ICON_CHECKBOX_COMPLETE: &str = include_str!("../../assets/icons/checkbox-fill.svg");
const ICON_CHECKBOX_EMPTY: &str = include_str!("../../assets/icons/checkbox-blank-line.svg");
const ICON_CHECK_MARK: &str = include_str!("../../assets/icons/check-line.svg");
const ICON_CIRCLE: &str = include_str!("../../assets/icons/checkbox-blank-circle-fill.svg");
const ICON_CONTACT: &str = include_str!("../../assets/icons/contacts-line.svg");
const ICON_EMAIL: &str = include_str!("../../assets/icons/send-plane-2-line.svg");
const ICON_ERROR: &str = include_str!("../../assets/icons/error-warning-line.svg");
const ICON_FILM: &str = include_str!("../../assets/icons/film-line.svg");
const ICON_FLAG: &str = include_str!("../../assets/icons/flag-fill.svg");
const ICON_HOME: &str = include_str!("../../assets/icons/home-4-line.svg");
const ICON_LIGHT_BULB: &str = include_str!("../../assets/icons/lightbulb-line.svg");
const ICON_LINK: &str = include_str!("../../assets/icons/link.svg");
const ICON_LOCK: &str = include_str!("../../assets/icons/lock-line.svg");
const ICON_MUSIC: &str = include_str!("../../assets/icons/music-fill.svg");
const ICON_PAPER: &str = include_str!("../../assets/icons/file-list-2-line.svg");
const ICON_PEN: &str = include_str!("../../assets/icons/mark-pen-line.svg");
const ICON_PERSON: &str = include_str!("../../assets/icons/user-line.svg");
const ICON_PHONE: &str = include_str!("../../assets/icons/phone-line.svg");
const ICON_QUESTION_MARK: &str = include_str!("../../assets/icons/question-mark.svg");
const ICON_SQUARE: &str = include_str!("../../assets/icons/checkbox-blank-fill.svg");
const ICON_STAR: &str = include_str!("../../assets/icons/star-fill.svg");

#[derive(Debug, Copy, Clone, PartialEq)]
enum IconSize {
    Normal,
    Large,
}

struct NoteTagIcon {
    html: Cow<'static, str>,
    size: IconSize,
    styles: StyleSet,
    is_checkbox: bool,
}

impl From<(Cow<'static, str>, IconSize)> for NoteTagIcon {
    fn from((html, size): (Cow<'static, str>, IconSize)) -> Self {
        Self {
            html,
            size,
            styles: StyleSet::new(),
            is_checkbox: false,
        }
    }
}

impl From<(Cow<'static, str>, IconSize, StyleSet)> for NoteTagIcon {
    fn from((html, size, styles): (Cow<'static, str>, IconSize, StyleSet)) -> Self {
        Self {
            html,
            size,
            styles,
            is_checkbox: false,
        }
    }
}

impl<'a> Renderer<'a> {
    pub(crate) fn render_with_note_tags(
        &mut self,
        note_tags: &[NoteTag],
        content: String,
    ) -> String {
        if let Some((markup, styles)) = self.render_note_tags(note_tags) {
            let mut contents = String::new();
            contents.push_str(&format!("<div style=\"{}\">{}", styles, markup));
            contents.push_str(&content);
            contents.push_str("</div>");

            contents
        } else {
            content
        }
    }

    fn build_note_tag_class_names(&mut self, icon: &NoteTagIcon) -> Vec<String> {
        let mut icon_classes = vec!["note-tag-icon".to_string()];

        if icon.styles.len() > 0 {
            let class = self.gen_class("icon");
            icon_classes.push(class.to_string());

            self.global_styles
                // Select both `svg` and `img`: `svg`s may be replaced with `img` later in the import process:
                .insert(
                    format!(".{} > svg, .{} > img", class, class),
                    icon.styles.clone(),
                );
        }

        if icon.is_checkbox {
            icon_classes.push("-checkbox".into());
        }

        if icon.size == IconSize::Large {
            icon_classes.push("-large".into());
        } else if icon.size == IconSize::Normal {
            icon_classes.push("-normal".into());
        }

        icon_classes
    }

    fn get_note_tag_attrs(
        &mut self,
        icon: &NoteTagIcon,
        status: ActionItemStatus,
        class_names: &[String],
    ) -> AttributeSet {
        let mut attrs = AttributeSet::new();
        attrs.set("class", class_names.join(" "));

        if icon.is_checkbox {
            attrs.set("role", "checkbox".into());
            attrs.set(
                "aria-checked",
                if status.completed() { "true" } else { "false" }.into(),
            );
            attrs.set("aria-disabled", "true".into());
        }

        attrs
    }

    pub(crate) fn render_note_tags(&mut self, note_tags: &[NoteTag]) -> Option<(String, StyleSet)> {
        let mut markup = String::new();
        let mut styles = StyleSet::new();

        if note_tags.is_empty() {
            return None;
        }

        for note_tag in note_tags {
            if let Some(def) = note_tag.definition() {
                if let Some(ColorRef::Manual { r, g, b }) = def.highlight_color() {
                    styles.set("background-color", format!("rgb({},{},{})", r, g, b));
                }

                if let Some(ColorRef::Manual { r, g, b }) = def.text_color() {
                    styles.set("color", format!("rgb({},{},{})", r, g, b));
                }

                if def.shape() != NoteTagShape::NoIcon {
                    let icon = self.note_tag_icon(def.shape(), note_tag.item_status());
                    let icon_classes = self.build_note_tag_class_names(&icon);
                    let attrs =
                        self.get_note_tag_attrs(&icon, note_tag.item_status(), &icon_classes);

                    markup.push_str(&format!("<span {}>{}</span>", attrs, icon.html,));
                }
            }
        }

        Some((markup, styles))
    }

    pub(crate) fn has_note_tag(&self, element: &OutlineElement) -> bool {
        element
            .contents()
            .iter()
            .flat_map(|element| element.rich_text())
            .any(|text| !text.note_tags().is_empty())
    }

    fn note_tag_icon(&self, shape: NoteTagShape, status: ActionItemStatus) -> NoteTagIcon {
        match shape {
            NoteTagShape::GreenCheckBox => self.icon_checkbox(status, COLOR_GREEN),
            NoteTagShape::YellowCheckBox => self.icon_checkbox(status, COLOR_YELLOW),
            NoteTagShape::BlueCheckBox => self.icon_checkbox(status, COLOR_BLUE),
            NoteTagShape::GreenStarCheckBox => self.icon_checkbox_with_star(status, COLOR_GREEN),
            NoteTagShape::YellowStarCheckBox => self.icon_checkbox_with_star(status, COLOR_YELLOW),
            NoteTagShape::BlueStarCheckBox => self.icon_checkbox_with_star(status, COLOR_BLUE),
            NoteTagShape::GreenExclamationCheckBox => {
                self.icon_checkbox_with_exclamation(status, COLOR_GREEN)
            }
            NoteTagShape::YellowExclamationCheckBox => {
                self.icon_checkbox_with_exclamation(status, COLOR_YELLOW)
            }
            NoteTagShape::BlueExclamationCheckBox => {
                self.icon_checkbox_with_exclamation(status, COLOR_BLUE)
            }
            NoteTagShape::GreenRightArrowCheckBox => {
                self.icon_checkbox_with_right_arrow(status, COLOR_GREEN)
            }
            NoteTagShape::YellowRightArrowCheckBox => {
                self.icon_checkbox_with_right_arrow(status, COLOR_YELLOW)
            }
            NoteTagShape::BlueRightArrowCheckBox => {
                self.icon_checkbox_with_right_arrow(status, COLOR_BLUE)
            }
            NoteTagShape::YellowStar => {
                let mut style = StyleSet::new();
                style.set("fill", COLOR_YELLOW.to_string());

                (Cow::from(ICON_STAR), IconSize::Normal, style).into()
            }

            NoteTagShape::QuestionMark => (Cow::from(ICON_QUESTION_MARK), IconSize::Normal).into(),

            NoteTagShape::HighPriority => (Cow::from(ICON_ERROR), IconSize::Normal).into(),
            NoteTagShape::ContactInformation => (Cow::from(ICON_PHONE), IconSize::Normal).into(),

            NoteTagShape::LightBulb => (Cow::from(ICON_LIGHT_BULB), IconSize::Normal).into(),

            NoteTagShape::Home => (Cow::from(ICON_HOME), IconSize::Normal).into(),
            NoteTagShape::CommentBubble => (Cow::from(ICON_BUBBLE), IconSize::Normal).into(),

            NoteTagShape::AwardRibbon => (Cow::from(ICON_AWARD), IconSize::Normal).into(),

            NoteTagShape::BlueCheckBox1 => self.icon_checkbox_with_1(status, COLOR_BLUE),

            NoteTagShape::BlueCheckBox2 => self.icon_checkbox_with_2(status, COLOR_BLUE),

            NoteTagShape::BlueCheckBox3 => self.icon_checkbox_with_3(status, COLOR_BLUE),

            NoteTagShape::BlueCheckMark => self.icon_checkmark(COLOR_BLUE),
            NoteTagShape::BlueCircle => self.icon_circle(COLOR_BLUE),

            NoteTagShape::GreenCheckBox1 => self.icon_checkbox_with_1(status, COLOR_GREEN),

            NoteTagShape::GreenCheckBox2 => self.icon_checkbox_with_2(status, COLOR_GREEN),

            NoteTagShape::GreenCheckBox3 => self.icon_checkbox_with_3(status, COLOR_GREEN),

            NoteTagShape::GreenCheckMark => self.icon_checkmark(COLOR_GREEN),
            NoteTagShape::GreenCircle => self.icon_circle(COLOR_GREEN),

            NoteTagShape::YellowCheckBox1 => self.icon_checkbox_with_1(status, COLOR_YELLOW),

            NoteTagShape::YellowCheckBox2 => self.icon_checkbox_with_2(status, COLOR_YELLOW),

            NoteTagShape::YellowCheckBox3 => self.icon_checkbox_with_3(status, COLOR_YELLOW),

            NoteTagShape::YellowCheckMark => self.icon_checkmark(COLOR_YELLOW),
            NoteTagShape::YellowCircle => self.icon_circle(COLOR_YELLOW),

            NoteTagShape::BluePersonCheckBox => self.icon_checkbox_with_person(status, COLOR_BLUE),
            NoteTagShape::YellowPersonCheckBox => {
                self.icon_checkbox_with_person(status, COLOR_YELLOW)
            }
            NoteTagShape::GreenPersonCheckBox => {
                self.icon_checkbox_with_person(status, COLOR_GREEN)
            }
            NoteTagShape::BlueFlagCheckBox => self.icon_checkbox_with_flag(status, COLOR_BLUE),
            NoteTagShape::RedFlagCheckBox => self.icon_checkbox_with_flag(status, COLOR_RED),
            NoteTagShape::GreenFlagCheckBox => self.icon_checkbox_with_flag(status, COLOR_GREEN),
            NoteTagShape::RedSquare => self.icon_square(COLOR_RED),
            NoteTagShape::YellowSquare => self.icon_square(COLOR_YELLOW),
            NoteTagShape::BlueSquare => self.icon_square(COLOR_BLUE),
            NoteTagShape::GreenSquare => self.icon_square(COLOR_GREEN),
            NoteTagShape::OrangeSquare => self.icon_square(COLOR_ORANGE),
            NoteTagShape::PinkSquare => self.icon_square(COLOR_PINK),
            NoteTagShape::EMailMessage => (Cow::from(ICON_EMAIL), IconSize::Normal).into(),

            NoteTagShape::Contact => (Cow::from(ICON_CONTACT), IconSize::Normal).into(),

            NoteTagShape::MusicalNote => (Cow::from(ICON_MUSIC), IconSize::Normal).into(),
            NoteTagShape::MovieClip => (Cow::from(ICON_FILM), IconSize::Normal).into(),

            NoteTagShape::HyperlinkGlobe => (Cow::from(ICON_LINK), IconSize::Normal).into(),

            NoteTagShape::Padlock => (Cow::from(ICON_LOCK), IconSize::Normal).into(),
            NoteTagShape::OpenBook => (Cow::from(ICON_BOOK), IconSize::Normal).into(),

            NoteTagShape::BlankPaperWithLines => (Cow::from(ICON_PAPER), IconSize::Normal).into(),

            NoteTagShape::Pen => (Cow::from(ICON_PEN), IconSize::Normal).into(),

            shape => self.icon_fallback(shape),
        }
    }

    fn icon_fallback(&self, shape: NoteTagShape) -> NoteTagIcon {
        log_warn!("Unsupported icon type: {:?}", shape);

        (Cow::from(ICON_QUESTION_MARK), IconSize::Normal).into()
    }

    fn icon_checkbox(&self, status: ActionItemStatus, color: &'static str) -> NoteTagIcon {
        let mut styles = StyleSet::new();
        styles.set("fill", color.to_string());

        let html = if status.completed() {
            Cow::from(ICON_CHECKBOX_COMPLETE)
        } else {
            Cow::from(ICON_CHECKBOX_EMPTY)
        };

        NoteTagIcon {
            html,
            size: IconSize::Large,
            styles,
            is_checkbox: true,
        }
    }

    fn icon_checkbox_with_person(
        &self,
        status: ActionItemStatus,
        color: &'static str,
    ) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, ICON_PERSON)
    }

    fn icon_checkbox_with_right_arrow(
        &self,
        status: ActionItemStatus,
        color: &'static str,
    ) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, ICON_ARROW_RIGHT)
    }

    fn icon_checkbox_with_star(
        &self,
        status: ActionItemStatus,
        color: &'static str,
    ) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, ICON_STAR)
    }

    fn icon_checkbox_with_flag(
        &self,
        status: ActionItemStatus,
        color: &'static str,
    ) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, ICON_FLAG)
    }

    fn icon_checkbox_with_1(&self, status: ActionItemStatus, color: &'static str) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, "<span class=\"content\">1</span>")
    }

    fn icon_checkbox_with_2(&self, status: ActionItemStatus, color: &'static str) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, "<span class=\"content\">2</span>")
    }

    fn icon_checkbox_with_3(&self, status: ActionItemStatus, color: &'static str) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, "<span class=\"content\">3</span>")
    }

    fn icon_checkbox_with_exclamation(
        &self,
        status: ActionItemStatus,
        color: &'static str,
    ) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, "<span class=\"content\">!</span>")
    }

    fn icon_checkbox_with(
        &self,
        status: ActionItemStatus,
        color: &'static str,
        secondary_icon: &'static str,
    ) -> NoteTagIcon {
        let mut style = StyleSet::new();
        style.set("fill", color.to_string());

        let mut content = String::new();
        content.push_str(if status.completed() {
            ICON_CHECKBOX_COMPLETE
        } else {
            ICON_CHECKBOX_EMPTY
        });

        content.push_str(&format!(
            "<span class=\"icon-secondary\">{}</span>",
            secondary_icon
        ));

        NoteTagIcon {
            html: Cow::from(content),
            size: IconSize::Large,
            styles: style,
            is_checkbox: true,
        }
    }

    fn icon_checkmark(&self, color: &'static str) -> NoteTagIcon {
        let mut style = StyleSet::new();
        style.set("fill", color.to_string());

        NoteTagIcon {
            is_checkbox: true,
            html: Cow::from(ICON_CHECK_MARK),
            size: IconSize::Large,
            styles: style,
        }
    }

    fn icon_circle(&self, color: &'static str) -> NoteTagIcon {
        let mut style = StyleSet::new();
        style.set("fill", color.to_string());

        (Cow::from(ICON_CIRCLE), IconSize::Normal, style).into()
    }

    fn icon_square(&self, color: &'static str) -> NoteTagIcon {
        let mut style = StyleSet::new();
        style.set("fill", color.to_string());

        (Cow::from(ICON_SQUARE), IconSize::Large, style).into()
    }
}
