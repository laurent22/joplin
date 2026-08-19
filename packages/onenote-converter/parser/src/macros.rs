macro_rules! guid {
    ({ $p0:tt - $p1:tt - $p2:tt - $p3:tt - $p4:tt }) => {
        crate::shared::guid::Guid::from_str(concat!(
            stringify!($p0),
            '-',
            stringify!($p1),
            '-',
            stringify!($p2),
            '-',
            stringify!($p3),
            '-',
            stringify!($p4),
        ))
        .unwrap()
    };
    ($guid:literal) => {
        crate::shared::guid::Guid::from_str($guid).unwrap()
    };
}

macro_rules! exguid {
    ({$guid:tt , $n:literal}) => {
        crate::shared::exguid::ExGuid::from_guid(guid!($guid), $n)
    };
}

macro_rules! parser_error {
    ($kind:tt , $( $message:tt )* ) => {
        parser_utils::errors::ErrorKind::$kind(
            format!("{} (in {}:{})", format!($( $message )*), file!(), line!()).into()
        )
    };
}

macro_rules! onestore_parse_error {
    ($( $message:tt )* ) => {
        parser_error!(
            MalformedOneStoreData,
            $( $message )*
        )
    };
}

macro_rules! unexpected_object_type_error {
    ( $object_type:expr ) => {
        parser_error!(
            MalformedOneNoteFileData,
            "unexpected object type: 0x{:X}",
            $object_type,
        )
    };
}

macro_rules! iterator_skip_if_matching {
    ($iterator:expr, $match_condition:pat) => {
        if matches!($iterator.peek(), $match_condition) {
            $iterator.next();
        }
    };
}

#[cfg(test)]
mod test {
    use crate::shared::exguid::ExGuid;
    use crate::shared::guid::Guid;

    #[test]
    fn parse_guid() {
        let guid = guid!({ 1A5A319C - C26B - 41AA - B9C5 - 9BD8C44E07D4 });

        assert_eq!(
            guid,
            Guid::from_str("1A5A319C-C26B-41AA-B9C5-9BD8C44E07D4").unwrap()
        );
    }

    #[test]
    fn parse_exguid() {
        let guid = exguid!({{1A5A319C-C26B-41AA-B9C5-9BD8C44E07D4}, 1});

        assert_eq!(
            guid,
            ExGuid::from_guid(
                Guid::from_str("1A5A319C-C26B-41AA-B9C5-9BD8C44E07D4").unwrap(),
                1
            )
        );
    }
}
