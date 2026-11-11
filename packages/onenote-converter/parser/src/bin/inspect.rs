use parser::Parser;
use parser_utils::errors::Error;
use std::{
    env::{self, Args},
    process::exit,
};

pub fn main() {
    let config = match Config::from_args(&mut env::args()) {
        Ok(config) => config,
        Err(error) => {
            print_help_text(&error.program_name, error.reason);
            exit(1)
        }
    };

    let input_path_string = &config.input_file;

    let mut parser = Parser::new();
    if config.output_mode == OutputMode::Section {
        let parsed_section = match parser.parse_section(input_path_string) {
            Ok(section) => section,
            Err(error) => handle_parse_error(&config, error),
        };

        println!("{:#?}", parsed_section);
    } else {
        let parsed_onestore = match parser.parse_onestore_raw(input_path_string) {
            Ok(section) => section,
            Err(error) => handle_parse_error(&config, error),
        };

        println!("{:#?}", parsed_onestore);
    }
}

fn handle_parse_error(config: &Config, error: Error) -> ! {
    let error = format!("Parse error: {error}");
    print_help_text(&config.program_name, &error);
    exit(3)
}

fn print_help_text(program_name: &str, error: &str) {
    let error_info = if error.is_empty() { "" } else { error };

    eprintln!("Usage: {program_name} <input_file> [--section|--onestore]");
    eprintln!("Description: Prints debug information about the given <input_file>");
    eprintln!("{error_info}");
}

struct ConfigParseError {
    reason: &'static str,
    program_name: String,
}

#[derive(PartialEq)]
enum OutputMode {
    /// Lower-level output
    FileContent,
    /// Higher-level output, including the parsed objects
    Section,
}

struct Config {
    input_file: String,
    output_mode: OutputMode,
    program_name: String,
}

impl Config {
    pub fn from_args(args: &mut Args) -> Result<Self, ConfigParseError> {
        let Some(program_name) = &args.next() else {
            return Err(ConfigParseError {
                reason: "Missing program name",
                program_name: "??".into(),
            });
        };
        let program_name = program_name.to_string();
        let Some(input_file) = args.next() else {
            return Err(ConfigParseError {
                reason: "Not enough arguments",
                program_name,
            });
        };

        let output_mode = args.next().unwrap_or("--onestore".into());
        let output_mode = match output_mode.as_str() {
            "--onestore" => Ok(OutputMode::FileContent),
            "--section" => Ok(OutputMode::Section),
            _ => {
                return Err(ConfigParseError {
                    reason: "Invalid output mode (expected --onestore or --section)",
                    program_name,
                });
            }
        }?;

        if args.next().is_some() {
            return Err(ConfigParseError {
                reason: "Too many arguments",
                program_name,
            });
        }

        Ok(Config {
            input_file,
            output_mode,
            program_name,
        })
    }
}
