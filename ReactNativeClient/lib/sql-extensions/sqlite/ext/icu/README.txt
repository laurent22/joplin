
This directory contains source code for the SQLite "ICU" extension, an
integration of the "International Components for Unicode" library with
SQLite. Documentation follows.

    1. Features
    
        1.1  SQL Scalars upper() and lower()
        1.2  Unicode Aware LIKE Operator
        1.3  ICU Collation Sequences
        1.4  SQL REGEXP Operator
    
    2. Compilation and Usage
    
    3. Bugs, Problems and Security Issues
    
        3.1  The "case_sensitive_like" Pragma
        3.2  The SQLITE_MAX_LIKE_PATTERN_LENGTH Macro
        3.3  Collation Sequence Security Issue


1. FEATURES

  1.1  SQL Scalars upper() and lower()

    SQLite's built-in implementations of these two functions only 
    provide case mapping for the 26 letters used in the English
    language. The ICU based functions provided by this extension
    provide case mapping, where defined, for the full range of 
    unicode characters.

    ICU provides two types of case mapping, "general" case mapping and
    "language specific". Refer to ICU documentation for the differences
    between the two. Specifically:

       http://www.icu-project.org/userguide/caseMappings.html
       http://www.icu-project.org/userguide/posix.html#case_mappings

    To utilise "general" case mapping, the upper() or lower() scalar 
    functions are invoked with one argument:

        upper('abc') -> 'ABC'
        lower('ABC') -> 'abc'

    To access ICU "language specific" case mapping, upper() or lower()
    should be invoked with two arguments. The second argument is the name
    of the locale to use. Passing an empty string ("") or SQL NULL value
    as the second argument is the same as invoking the 1 argument version
    of upper() or lower():

        lower('I', 'en_us') -> 'i'
        lower('I', 'tr_tr') -> 'ı' (small dotless i)

  1.2  Unicode Aware LIKE Operator

    Similarly to the upper() and lower() functions, the built-in SQLite LIKE
    operator understands case equivalence for the 26 letters of the English
    language alphabet. The implementation of LIKE included in this
    extension uses the ICU function u_foldCase() to provide case
    independent comparisons for the full range of unicode characters.  

    The U_FOLD_CASE_DEFAULT flag is passed to u_foldCase(), meaning the
    dotless 'I' character used in the Turkish language is considered
    to be in the same equivalence class as the dotted 'I' character
    used by many languages (including English).

  1.3  ICU Collation Sequences

    A special SQL scalar function, icu_load_collation() is provided that 
    may be used to register ICU collation sequences with SQLite. It
    is always called with exactly two arguments, the ICU locale 
    identifying the collation sequence to ICU, and the name of the
    SQLite collation sequence to create. For example, to create an
    SQLite collation sequence named "turkish" using Turkish language
    sorting rules, the SQL statement:

        SELECT icu_load_collation('tr_TR', 'turkish');

    Or, for Australian English:

        SELECT icu_load_collation('en_AU', 'australian');

    The identifiers "turkish" and "australian" may then be used
    as collation sequence identifiers in SQL statements:

        CREATE TABLE aust_turkish_penpals(
          australian_penpal_name TEXT COLLATE australian,
          turkish_penpal_name    TEXT COLLATE turkish
        );
  
  1.4 SQL REGEXP Operator

    This extension provides an implementation of the SQL binary
    comparision operator "REGEXP", based on the regular expression functions
    provided by the ICU library. The syntax of the operator is as described
    in SQLite documentation:

        <string> REGEXP <re-pattern>

    This extension uses the ICU defaults for regular expression matching
    behavior. Specifically, this means that:

        * Matching is case-sensitive,
        * Regular expression comments are not allowed within patterns, and
        * The '^' and '$' characters match the beginning and end of the
          <string> argument, not the beginning and end of lines within
          the <string> argument.

    Even more specifically, the value passed to the "flags" parameter
    of ICU C function uregex_open() is 0.


2  COMPILATION AND USAGE

  The easiest way to compile and use the ICU extension is to build
  and use it as a dynamically loadable SQLite extension. To do this
  using gcc on *nix:

    gcc -fPIC -shared icu.c `pkg-config --libs --cflags icu-uc icu-io` \
        -o libSqliteIcu.so

  You may need to add "-I" flags so that gcc can find sqlite3ext.h
  and sqlite3.h. The resulting shared lib, libSqliteIcu.so, may be
  loaded into sqlite in the same way as any other dynamically loadable
  extension.


3 BUGS, PROBLEMS AND SECURITY ISSUES

  3.1 The "case_sensitive_like" Pragma

    This extension does not work well with the "case_sensitive_like"
    pragma. If this pragma is used before the ICU extension is loaded,
    then the pragma has no effect. If the pragma is used after the ICU
    extension is loaded, then SQLite ignores the ICU implementation and
    always uses the built-in LIKE operator.

    The ICU extension LIKE operator is always case insensitive.

  3.2 The SQLITE_MAX_LIKE_PATTERN_LENGTH Macro

    Passing very long patterns to the built-in SQLite LIKE operator can
    cause excessive CPU usage. To curb this problem, SQLite defines the
    SQLITE_MAX_LIKE_PATTERN_LENGTH macro as the maximum length of a
    pattern in bytes (irrespective of encoding). The default value is
    defined in internal header file "limits.h".
    
    The ICU extension LIKE implementation suffers from the same 
    problem and uses the same solution. However, since the ICU extension
    code does not include the SQLite file "limits.h", modifying
    the default value therein does not affect the ICU extension.
    The default value of SQLITE_MAX_LIKE_PATTERN_LENGTH used by
    the ICU extension LIKE operator is 50000, defined in source 
    file "icu.c".

  3.3 Collation Sequence Security Issue

    Internally, SQLite assumes that indices stored in database files
    are sorted according to the collation sequence indicated by the
    SQL schema. Changing the definition of a collation sequence after
    an index has been built is therefore equivalent to database
    corruption. The SQLite library is not very well tested under
    these conditions, and may contain potential buffer overruns
    or other programming errors that could be exploited by a malicious
    programmer.

    If the ICU extension is used in an environment where potentially
    malicious users may execute arbitrary SQL (i.e. gears), they
    should be prevented from invoking the icu_load_collation() function,
    possibly using the authorisation callback.
