# 2007 June 21
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library. The focus 
# of this script is testing the pluggable tokeniser feature of the 
# FTS3 module.
#
# $Id: fts3atoken.test,v 1.1 2007/08/20 17:38:42 shess Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

set ::testprefix fts3atoken

proc escape_string {str} {
  set out ""
  foreach char [split $str ""] {
    scan $char %c i
    if {$i<=127} {
      append out $char
    } else {
      append out [format {\x%.4x} $i]
    }
  }
  set out
}

#--------------------------------------------------------------------------
# Test cases fts3atoken-1.* are the warm-body test for the SQL scalar
# function fts3_tokenizer(). The procedure is as follows:
#
#   1: Verify that there is no such fts3 tokenizer as 'blah'.
#
#   2: Query for the built-in tokenizer 'simple'. Insert a copy of the
#      retrieved value as tokenizer 'blah'.
#
#   3: Test that the value returned for tokenizer 'blah' is now the
#      same as that retrieved for 'simple'.
#
#   4: Test that it is now possible to create an fts3 table using 
#      tokenizer 'blah' (it was not possible in step 1).
#
#   5: Test that the table created to use tokenizer 'blah' is usable.
#
sqlite3_db_config db SQLITE_DBCONFIG_ENABLE_FTS3_TOKENIZER 1
do_test fts3atoken-1.1 {
  catchsql {
    CREATE VIRTUAL TABLE t1 USING fts3(content, tokenize blah);
  }
} {1 {unknown tokenizer: blah}}
do_test fts3atoken-1.2 {
  execsql {
    SELECT fts3_tokenizer('blah', fts3_tokenizer('simple')) IS NULL;
  }
} {0}
do_test fts3atoken-1.3 {
  execsql {
    SELECT fts3_tokenizer('blah') == fts3_tokenizer('simple');
  }
} {1}
do_test fts3atoken-1.4 {
  catchsql {
    CREATE VIRTUAL TABLE t1 USING fts3(content, tokenize blah);
  }
} {0 {}}
do_test fts3atoken-1.5 {
  execsql {
    INSERT INTO t1(content) VALUES('There was movement at the station');
    INSERT INTO t1(content) VALUES('For the word has passed around');
    INSERT INTO t1(content) VALUES('That the colt from ol regret had got');
    SELECT content FROM t1 WHERE content MATCH 'movement'
  }
} {{There was movement at the station}}

unset -nocomplain simple blah2name simplename
set simplename "simple"
set blah2name "blah2"
set simple [db one {SELECT fts3_tokenizer('simple')}]
sqlite3_db_config db SQLITE_DBCONFIG_ENABLE_FTS3_TOKENIZER 0
do_catchsql_test 1.6 {
  SELECT fts3_tokenizer('blah', fts3_tokenizer('simple')) IS NULL;
} {1 {fts3tokenize disabled}}
do_test fts3atoken-1.7 {
  execsql {
    SELECT fts3_tokenizer('blah2', $simple) IS NULL;
  }
} {1}

# With ENABLE_FTS3_TOKENIZER off, the fts3_tokenzer(1) function
# returns NULL unless the first parameter is a bound parameter.
# If the first parameter is a bound parameter, then fts3_tokenizer(1)
# returns the actual pointer value as a BLOB.
#
do_test fts3atoken-1.8 {
  execsql {
    SELECT fts3_tokenizer($blah2name) == fts3_tokenizer($simplename),
           typeof(fts3_tokenizer($blah2name)),
           typeof(fts3_tokenizer('blah2')),
           typeof(fts3_tokenizer($simplename)),
           typeof(fts3_tokenizer('simple'));
  }
} {1 blob null blob null}

# With ENABLE_FTS3_TOKENIZER on, fts3_tokenizer() always returns
# the BLOB pointer, regardless the parameter
#
sqlite3_db_config db SQLITE_DBCONFIG_ENABLE_FTS3_TOKENIZER 1
do_test fts3atoken-1.9 {
  execsql {
    SELECT fts3_tokenizer('blah2') == fts3_tokenizer('simple'),
           typeof(fts3_tokenizer($blah2name)),
           typeof(fts3_tokenizer('blah2')),
           typeof(fts3_tokenizer($simplename)),
           typeof(fts3_tokenizer('simple'));
  }
} {1 blob blob blob blob}

# 2019-12-31:  The fts3_tokenizer() function can never be invoked from
# within a trigger or view.
#
do_catchsql_test fts3atoken-1.10 {
  CREATE VIEW v110(x) AS
      SELECT fts3_tokenizer('tok110', fts3_tokenizer('simple')) IS NULL;
} {0 {}}
do_catchsql_test fts3atoken-1.11 {
  SELECT * FROM v110;
} {1 {unsafe use of fts3_tokenizer()}}
do_catchsql_test fts3atoken-1.12 {
  CREATE TABLE t110(a,b);
  CREATE TRIGGER r110 AFTER INSERT ON t110 BEGIN
      SELECT fts3_tokenizer('tok110', fts3_tokenizer('simple')) IS NULL;
  END;
} {0 {}}
do_catchsql_test fts3atoken-1.13 {
  INSERT INTO t110(a,b) VALUES(1,2);
} {1 {unsafe use of fts3_tokenizer()}}
do_catchsql_test fts3atoken-1.14 {
  SELECT * FROM t110;
} {0 {}}

#--------------------------------------------------------------------------
# Test cases fts3atoken-2.* test error cases in the scalar function based
# API for getting and setting tokenizers.
#
do_test fts3atoken-2.1 {
  catchsql {
    SELECT fts3_tokenizer('nosuchtokenizer');
  }
} {1 {unknown tokenizer: nosuchtokenizer}}

#--------------------------------------------------------------------------
# Test cases fts3atoken-3.* test the three built-in tokenizers with a
# simple input string via the built-in test function. This is as much
# to test the test function as the tokenizer implementations.
#
sqlite3_db_config db SQLITE_DBCONFIG_ENABLE_FTS3_TOKENIZER 1
do_test fts3atoken-3.1 {
  execsql {
    SELECT fts3_tokenizer_test('simple', 'I don''t see how');
  }
} {{0 i I 1 don don 2 t t 3 see see 4 how how}}
do_test fts3atoken-3.2 {
  execsql {
    SELECT fts3_tokenizer_test('porter', 'I don''t see how');
  }
} {{0 i I 1 don don 2 t t 3 see see 4 how how}}
ifcapable icu {
  do_test fts3atoken-3.3 {
    execsql {
      SELECT fts3_tokenizer_test('icu', 'I don''t see how');
    }
  } {{0 i I 1 don't don't 2 see see 3 how how}}
}

#--------------------------------------------------------------------------
# Test cases fts3atoken-4.* test the ICU tokenizer. In practice, this
# tokenizer only has two modes - "thai" and "everybody else". Some other
# Asian languages (Lao, Khmer etc.) require the same special treatment as 
# Thai, but ICU doesn't support them yet.
#
ifcapable icu {

  proc do_icu_test {name locale input output} {
    set ::out [db eval { SELECT fts3_tokenizer_test('icu', $locale, $input) }]
    do_test $name {
      lindex $::out 0
    } $output
  }
  
  do_icu_test fts3atoken-4.1 en_US  {}   {}
  do_icu_test fts3atoken-4.2 en_US {Test cases fts3} [list \
    0 test Test 1 cases cases 2 fts3 fts3
  ]

  # The following test shows that ICU is smart enough to recognise
  # Thai chararacters, even when the locale is set to English/United 
  # States.
  #
  set input "\u0e2d\u0e30\u0e44\u0e23\u0e19\u0e30\u0e04\u0e23\u0e31\u0e1a"
  set output    "0 \u0e2d\u0e30\u0e44\u0e23 \u0e2d\u0e30\u0e44\u0e23 "
  append output "1 \u0e19\u0e30 \u0e19\u0e30 "
  append output "2 \u0e04\u0e23\u0e31\u0e1a \u0e04\u0e23\u0e31\u0e1a"

  do_icu_test fts3atoken-4.3 th_TH  $input $output
  do_icu_test fts3atoken-4.4 en_US  $input $output

  # ICU handles an unknown locale by falling back to the default.
  # So this is not an error.
  do_icu_test fts3atoken-4.5 MiddleOfTheOcean  $input $output

  set    longtoken "AReallyReallyLongTokenOneThatWillSurelyRequire"
  append longtoken "AReallocInTheIcuTokenizerCode"

  set    input "short tokens then "
  append input $longtoken
  set    output "0 short short "
  append output "1 tokens tokens "
  append output "2 then then "
  append output "3 [string tolower $longtoken] $longtoken"

  do_icu_test fts3atoken-4.6 MiddleOfTheOcean  $input $output
  do_icu_test fts3atoken-4.7 th_TH  $input $output
  do_icu_test fts3atoken-4.8 en_US  $input $output

  do_execsql_test 5.1 {
    CREATE VIRTUAL TABLE x1 USING fts3(name,TOKENIZE icu en_US);
    insert into x1 (name) values (NULL);
    insert into x1 (name) values (NULL);
    delete from x1;
  }

  proc cp_to_str {codepoint_list} {
    set fmt [string repeat %c [llength $codepoint_list]]
    eval [list format $fmt] $codepoint_list
  }

  do_test 5.2 {
    set str [cp_to_str {19968 26085 32822 32645 27874 23433 20986}]
    execsql { INSERT INTO x1 VALUES($str) }
  } {}
}

do_test fts3atoken-internal {
  execsql { SELECT fts3_tokenizer_internal_test() }
} {ok}

#-------------------------------------------------------------------------
# Test empty tokenizer names.
#
do_catchsql_test 6.1.1 {
  CREATE VIRTUAL TABLE t3 USING fts4(tokenize="");
} {1 {unknown tokenizer: }}
do_catchsql_test 6.1.2 {
  CREATE VIRTUAL TABLE t3 USING fts4(tokenize=);
} {1 {unknown tokenizer: }}
do_catchsql_test 6.1.3 {
  CREATE VIRTUAL TABLE t3 USING fts4(tokenize="   ");
} {1 {unknown tokenizer:    }}

do_catchsql_test 6.2.1 {
  SELECT fts3_tokenizer(NULL);
} {1 {unknown tokenizer: }}

sqlite3_db_config db SQLITE_DBCONFIG_ENABLE_FTS3_TOKENIZER 1
do_catchsql_test 6.2.2 {
  SELECT fts3_tokenizer(NULL, X'1234567812345678');
} {1 {argument type mismatch}}
do_catchsql_test 6.2.3 {
  SELECT fts3_tokenizer(NULL, X'12345678');
} {1 {argument type mismatch}}


finish_test
