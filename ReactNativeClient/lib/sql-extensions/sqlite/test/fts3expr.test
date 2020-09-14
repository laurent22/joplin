# 2006 September 9
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is testing the FTS3 module.
#
# $Id: fts3expr.test,v 1.9 2009/07/28 16:44:26 danielk1977 Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

set sqlite_fts3_enable_parentheses 1

proc test_fts3expr {expr} {
  db one {SELECT fts3_exprtest('simple', $expr, 'a', 'b', 'c')}
}

do_test fts3expr-1.0 {
  test_fts3expr "abcd"
} {PHRASE 3 0 abcd}
do_test fts3expr-1.1 {
  test_fts3expr " tag "
} {PHRASE 3 0 tag}

do_test fts3expr-1.2 {
  test_fts3expr "ab AND cd"
} {AND {PHRASE 3 0 ab} {PHRASE 3 0 cd}}
do_test fts3expr-1.2.1 {
  test_fts3expr "ab cd"
} {AND {PHRASE 3 0 ab} {PHRASE 3 0 cd}}
do_test fts3expr-1.3 {
  test_fts3expr "ab OR cd"
} {OR {PHRASE 3 0 ab} {PHRASE 3 0 cd}}
do_test fts3expr-1.4 {
  test_fts3expr "ab NOT cd"
} {NOT {PHRASE 3 0 ab} {PHRASE 3 0 cd}}
do_test fts3expr-1.5 {
  test_fts3expr "ab NEAR cd"
} {NEAR/10 {PHRASE 3 0 ab} {PHRASE 3 0 cd}}
do_test fts3expr-1.6.1 {
  test_fts3expr "ab NEAR/5 cd"
} {NEAR/5 {PHRASE 3 0 ab} {PHRASE 3 0 cd}}
do_test fts3expr-1.6.2 {
  test_fts3expr "ab NEAR/87654321 cd"
} {NEAR/87654321 {PHRASE 3 0 ab} {PHRASE 3 0 cd}}
do_test fts3expr-1.6.3 {
  test_fts3expr "ab NEAR/7654321 cd"
} {NEAR/7654321 {PHRASE 3 0 ab} {PHRASE 3 0 cd}}
do_test fts3expr-1.6.4 {
  test_fts3expr "ab NEAR/654321 cd"
} {NEAR/654321 {PHRASE 3 0 ab} {PHRASE 3 0 cd}}
do_test fts3expr-1.6.5 {
  test_fts3expr "ab NEAR/54321 cd"
} {NEAR/54321 {PHRASE 3 0 ab} {PHRASE 3 0 cd}}
do_test fts3expr-1.6.6 {
  test_fts3expr "ab NEAR/4321 cd"
} {NEAR/4321 {PHRASE 3 0 ab} {PHRASE 3 0 cd}}
do_test fts3expr-1.6.7 {
  test_fts3expr "ab NEAR/321 cd"
} {NEAR/321 {PHRASE 3 0 ab} {PHRASE 3 0 cd}}
do_test fts3expr-1.6.8 {
  test_fts3expr "ab NEAR/21 cd"
} {NEAR/21 {PHRASE 3 0 ab} {PHRASE 3 0 cd}}

do_test fts3expr-1.7 {
  test_fts3expr {"one two three"}
} {PHRASE 3 0 one two three}
do_test fts3expr-1.8.1 {
  test_fts3expr {zero "one two three" four}
} {AND {AND {PHRASE 3 0 zero} {PHRASE 3 0 one two three}} {PHRASE 3 0 four}}
do_test fts3expr-1.8.2 {
  test_fts3expr {zero AND "one two three" four}
} {AND {AND {PHRASE 3 0 zero} {PHRASE 3 0 one two three}} {PHRASE 3 0 four}}
do_test fts3expr-1.8.3 {
  test_fts3expr {zero "one two three" AND four}
} {AND {AND {PHRASE 3 0 zero} {PHRASE 3 0 one two three}} {PHRASE 3 0 four}}
do_test fts3expr-1.8.4 {
  test_fts3expr {zero AND "one two three" AND four}
} {AND {AND {PHRASE 3 0 zero} {PHRASE 3 0 one two three}} {PHRASE 3 0 four}}
do_test fts3expr-1.9.1 {
  test_fts3expr {"one* two three"}
} {PHRASE 3 0 one+ two three}
do_test fts3expr-1.9.2 {
  test_fts3expr {"one two* three"}
} {PHRASE 3 0 one two+ three}
do_test fts3expr-1.9.3 {
  test_fts3expr {"one* two* three"}
} {PHRASE 3 0 one+ two+ three}
do_test fts3expr-1.9.4 {
  test_fts3expr {"one two three*"}
} {PHRASE 3 0 one two three+}
do_test fts3expr-1.9.5 {
  test_fts3expr {"one* two three*"}
} {PHRASE 3 0 one+ two three+}
do_test fts3expr-1.9.6 {
  test_fts3expr {"one two* three*"}
} {PHRASE 3 0 one two+ three+}
do_test fts3expr-1.9.7 {
  test_fts3expr {"one* two* three*"}
} {PHRASE 3 0 one+ two+ three+}

do_test fts3expr-1.10 {
  test_fts3expr {one* two}
} {AND {PHRASE 3 0 one+} {PHRASE 3 0 two}}
do_test fts3expr-1.11 {
  test_fts3expr {one two*}
} {AND {PHRASE 3 0 one} {PHRASE 3 0 two+}}

do_test fts3expr-1.14 {
  test_fts3expr {a:one two}
} {AND {PHRASE 0 0 one} {PHRASE 3 0 two}}
do_test fts3expr-1.15.1 {
  test_fts3expr {one b:two}
} {AND {PHRASE 3 0 one} {PHRASE 1 0 two}}
do_test fts3expr-1.15.2 {
  test_fts3expr {one B:two}
} {AND {PHRASE 3 0 one} {PHRASE 1 0 two}}

do_test fts3expr-1.16 {
  test_fts3expr {one AND two AND three AND four AND five}
} [list AND \
        [list AND \
              [list AND \
                    [list AND {PHRASE 3 0 one} {PHRASE 3 0 two}] \
                    {PHRASE 3 0 three} \
              ] \
              {PHRASE 3 0 four} \
        ] \
        {PHRASE 3 0 five} \
  ]
do_test fts3expr-1.17 {
  test_fts3expr {(one AND two) AND ((three AND four) AND five)}
} [list AND \
        [list AND {PHRASE 3 0 one} {PHRASE 3 0 two}] \
        [list AND \
              [list AND {PHRASE 3 0 three} {PHRASE 3 0 four}] \
             {PHRASE 3 0 five} \
        ] \
  ]
do_test fts3expr-1.18 {
  test_fts3expr {(one AND two) OR ((three AND four) AND five)}
} [list OR \
        [list AND {PHRASE 3 0 one} {PHRASE 3 0 two}] \
        [list AND \
              [list AND {PHRASE 3 0 three} {PHRASE 3 0 four}] \
             {PHRASE 3 0 five} \
        ] \
  ]
do_test fts3expr-1.19 {
  test_fts3expr {(one AND two) AND ((three AND four) OR five)}
} [list AND \
        [list AND {PHRASE 3 0 one} {PHRASE 3 0 two}] \
        [list OR \
              [list AND {PHRASE 3 0 three} {PHRASE 3 0 four}] \
             {PHRASE 3 0 five} \
        ] \
  ]
do_test fts3expr-1.20 {
  test_fts3expr {(one OR two) AND ((three OR four) AND five)}
} [list AND \
        [list OR {PHRASE 3 0 one} {PHRASE 3 0 two}] \
        [list AND \
              [list OR {PHRASE 3 0 three} {PHRASE 3 0 four}] \
             {PHRASE 3 0 five} \
        ] \
  ]
do_test fts3expr-1.21 {
  test_fts3expr {(one OR two) AND ((three NOT four) AND five)}
} [list AND \
        [list OR {PHRASE 3 0 one} {PHRASE 3 0 two}] \
        [list AND \
              [list NOT {PHRASE 3 0 three} {PHRASE 3 0 four}] \
             {PHRASE 3 0 five} \
        ] \
  ]
do_test fts3expr-1.22 {
  test_fts3expr {(one OR two) NOT ((three OR four) AND five)}
} [list NOT \
        [list OR {PHRASE 3 0 one} {PHRASE 3 0 two}] \
        [list AND \
              [list OR {PHRASE 3 0 three} {PHRASE 3 0 four}] \
             {PHRASE 3 0 five} \
        ] \
  ]
do_test fts3expr-1.23 {
  test_fts3expr {(((((one OR two))))) NOT (((((three OR four))) AND five))}
} [list NOT \
        [list OR {PHRASE 3 0 one} {PHRASE 3 0 two}] \
        [list AND \
              [list OR {PHRASE 3 0 three} {PHRASE 3 0 four}] \
             {PHRASE 3 0 five} \
        ] \
  ]
do_test fts3expr-1.24 {
  test_fts3expr {one NEAR two}
} [list NEAR/10 {PHRASE 3 0 one} {PHRASE 3 0 two}]
do_test fts3expr-1.25 {
  test_fts3expr {(one NEAR two)}
} [list NEAR/10 {PHRASE 3 0 one} {PHRASE 3 0 two}]
do_test fts3expr-1.26 {
  test_fts3expr {((((((one NEAR two))))))}
} [list NEAR/10 {PHRASE 3 0 one} {PHRASE 3 0 two}]
do_test fts3expr-1.27 {
  test_fts3expr {(one NEAR two) OR ((three OR four) AND five)}
} [list OR \
        [list NEAR/10 {PHRASE 3 0 one} {PHRASE 3 0 two}] \
        [list AND \
              [list OR {PHRASE 3 0 three} {PHRASE 3 0 four}] \
             {PHRASE 3 0 five} \
        ] \
  ]
do_test fts3expr-1.28 {
  test_fts3expr {(one NEAR/321 two) OR ((three OR four) AND five)}
} [list OR \
        [list NEAR/321 {PHRASE 3 0 one} {PHRASE 3 0 two}] \
        [list AND \
              [list OR {PHRASE 3 0 three} {PHRASE 3 0 four}] \
             {PHRASE 3 0 five} \
        ] \
  ]

proc strip_phrase_data {L} {
  if {[lindex $L 0] eq "PHRASE"} {
    return [lrange $L 3 end]
  }
  return [list \
    [lindex $L 0] \
    [strip_phrase_data [lindex $L 1]] \
    [strip_phrase_data [lindex $L 2]] \
  ]
}
proc test_fts3expr2 {expr} {
  strip_phrase_data [
    db one {SELECT fts3_exprtest('simple', $expr, 'a', 'b', 'c')}
  ]
}
do_test fts3expr-2.1 {
  test_fts3expr2 "ab OR cd AND ef"
} {OR ab {AND cd ef}}
do_test fts3expr-2.2 {
  test_fts3expr2 "cd AND ef OR ab"
} {OR {AND cd ef} ab}
do_test fts3expr-2.3 {
  test_fts3expr2 "ab AND cd AND ef OR gh"
} {OR {AND {AND ab cd} ef} gh}
do_test fts3expr-2.4 {
  test_fts3expr2 "ab AND cd OR ef AND gh"
} {OR {AND ab cd} {AND ef gh}}
do_test fts3expr-2.5 {
  test_fts3expr2 "ab cd"
} {AND ab cd}

do_test fts3expr-3.1 {
  test_fts3expr2 "(ab OR cd) AND ef"
} {AND {OR ab cd} ef}
do_test fts3expr-3.2 {
  test_fts3expr2 "ef AND (ab OR cd)"
} {AND ef {OR ab cd}}
do_test fts3expr-3.3 {
  test_fts3expr2 "(ab OR cd)"
} {OR ab cd}
do_test fts3expr-3.4 {
  test_fts3expr2 "(((ab OR cd)))"
} {OR ab cd}

do_test fts3expr-3.5 {
  test_fts3expr2 "one AND (two NEAR three)"
} {AND one {NEAR/10 two three}}
do_test fts3expr-3.6 {
  test_fts3expr2 "one (two NEAR three)"
} {AND one {NEAR/10 two three}}
do_test fts3expr-3.7 {
  test_fts3expr2 "(two NEAR three) one"
} {AND {NEAR/10 two three} one}
do_test fts3expr-3.8 {
  test_fts3expr2 "(two NEAR three) AND one"
} {AND {NEAR/10 two three} one}
do_test fts3expr-3.9 {
  test_fts3expr2 "(two NEAR three) (four five)"
} {AND {NEAR/10 two three} {AND four five}}
do_test fts3expr-3.10 {
  test_fts3expr2 "(two NEAR three) AND (four five)"
} {AND {NEAR/10 two three} {AND four five}}
do_test fts3expr-3.11 {
  test_fts3expr2 "(two NEAR three) (four NEAR five)"
} {AND {NEAR/10 two three} {NEAR/10 four five}}
do_test fts3expr-3.12 {
  test_fts3expr2 "(two NEAR three) OR (four NEAR five)"
} {OR {NEAR/10 two three} {NEAR/10 four five}}

do_test fts3expr-3.13 {
  test_fts3expr2 "(two NEAR/1a three)"
} {AND {AND {AND two near} 1a} three}

do_test fts3expr-3.14 {
  test_fts3expr2 "(two NEAR// three)"
} {AND {AND two near} three}
do_test fts3expr-3.15 {
  test_fts3expr2 "(two NEAR/: three)"
} {AND {AND two near} three}

do_test fts3expr-3.16 {
  test_fts3expr2 "(two NEAR three)OR(four NEAR five)"
} {OR {NEAR/10 two three} {NEAR/10 four five}}
do_test fts3expr-3.17 {
  test_fts3expr2 "(two NEAR three)OR\"four five\""
} {OR {NEAR/10 two three} {four five}}
do_test fts3expr-3.18 {
  test_fts3expr2 "one \u0080wo"
} "AND one \u0080wo"



#------------------------------------------------------------------------
# The following tests, fts3expr-4.*, test the parsers response to syntax
# errors in query expressions. This is done using a real fts3 table and
# MATCH clauses, not the parser test interface.
# 
do_test fts3expr-4.1 {
  execsql { CREATE VIRTUAL TABLE t1 USING fts3(a, b, c) }
} {}

# Mismatched parenthesis:
do_test fts3expr-4.2.1 {
  catchsql { SELECT * FROM t1 WHERE t1 MATCH 'example AND (hello OR world))' }
} {1 {malformed MATCH expression: [example AND (hello OR world))]}}
do_test fts3expr-4.2.2 {
  catchsql { SELECT * FROM t1 WHERE t1 MATCH 'example AND (hello OR world' }
} {1 {malformed MATCH expression: [example AND (hello OR world]}}
do_test fts3expr-4.2.3 {
  catchsql { SELECT * FROM t1 WHERE t1 MATCH '(hello' }
} {1 {malformed MATCH expression: [(hello]}}
do_test fts3expr-4.2.4 {
  catchsql { SELECT * FROM t1 WHERE t1 MATCH '(' }
} {1 {malformed MATCH expression: [(]}}
do_test fts3expr-4.2.5 {
  catchsql { SELECT * FROM t1 WHERE t1 MATCH ')' }
} {1 {malformed MATCH expression: [)]}}

do_test fts3expr-4.2.6 {
  catchsql { SELECT * FROM t1 WHERE t1 MATCH 'example (hello world' }
} {1 {malformed MATCH expression: [example (hello world]}}

# Unterminated quotation marks:
do_test fts3expr-4.3.1 {
  catchsql { SELECT * FROM t1 WHERE t1 MATCH 'example OR "hello world' }
} {1 {malformed MATCH expression: [example OR "hello world]}}
do_test fts3expr-4.3.2 {
  catchsql { SELECT * FROM t1 WHERE t1 MATCH 'example OR hello world"' }
} {1 {malformed MATCH expression: [example OR hello world"]}}

# Binary operators without the required operands.
do_test fts3expr-4.4.1 {
  catchsql { SELECT * FROM t1 WHERE t1 MATCH 'OR hello world' }
} {1 {malformed MATCH expression: [OR hello world]}}
do_test fts3expr-4.4.2 {
  catchsql { SELECT * FROM t1 WHERE t1 MATCH 'hello world OR' }
} {1 {malformed MATCH expression: [hello world OR]}}
do_test fts3expr-4.4.3 {
  catchsql { SELECT * FROM t1 WHERE t1 MATCH 'one (hello world OR) two' }
} {1 {malformed MATCH expression: [one (hello world OR) two]}}
do_test fts3expr-4.4.4 {
  catchsql { SELECT * FROM t1 WHERE t1 MATCH 'one (OR hello world) two' }
} {1 {malformed MATCH expression: [one (OR hello world) two]}}

# NEAR operators with something other than phrases as arguments.
do_test fts3expr-4.5.1 {
  catchsql { SELECT * FROM t1 WHERE t1 MATCH '(hello OR world) NEAR one' }
} {1 {malformed MATCH expression: [(hello OR world) NEAR one]}}
do_test fts3expr-4.5.2 {
  catchsql { SELECT * FROM t1 WHERE t1 MATCH 'one NEAR (hello OR world)' }
} {1 {malformed MATCH expression: [one NEAR (hello OR world)]}}

#------------------------------------------------------------------------
# The following OOM tests are designed to cover cases in fts3_expr.c.
# 
source $testdir/malloc_common.tcl
do_malloc_test fts3expr-malloc-1 -sqlbody {
  SELECT fts3_exprtest('simple', 'a b c "d e f"', 'a', 'b', 'c')
}
do_malloc_test fts3expr-malloc-2 -tclprep {
  set sqlite_fts3_enable_parentheses 0
} -sqlbody {
  SELECT fts3_exprtest('simple', 'a -b', 'a', 'b', 'c')
} -cleanup {
  set sqlite_fts3_enable_parentheses 1
}

#------------------------------------------------------------------------
# The following tests are not very important. They cover error handling
# cases in the test code, which makes test coverage easier to measure.
# 
do_test fts3expr-5.1 {
  catchsql { SELECT fts3_exprtest('simple', 'a b') }
} {1 {Usage: fts3_exprtest(tokenizer, expr, col1, ...}}
do_test fts3expr-5.2 {
  catchsql { SELECT fts3_exprtest('doesnotexist', 'a b', 'c') }
} {1 {unknown tokenizer: doesnotexist}}
do_test fts3expr-5.3 {
  catchsql { SELECT fts3_exprtest('simple', 'a b OR', 'c') }
} {1 {Error parsing expression}}

#------------------------------------------------------------------------
# The next set of tests verifies that things actually work as they are
# supposed to when using the new syntax.
# 
do_test fts3expr-6.1 {
  execsql {
    CREATE VIRTUAL TABLE t1 USING fts3(a);
  }
  for {set ii 1} {$ii < 32} {incr ii} {
    set v [list]
    if {$ii & 1}  { lappend v one }
    if {$ii & 2}  { lappend v two }
    if {$ii & 4}  { lappend v three }
    if {$ii & 8}  { lappend v four }
    if {$ii & 16} { lappend v five }
    execsql { INSERT INTO t1 VALUES($v) }
  }

  execsql {SELECT rowid FROM t1 WHERE t1 MATCH 'five four one' ORDER BY rowid}
} {25 27 29 31}

foreach {id expr res} {

  2 "five four NOT one" {24 26 28 30}

  3 "five AND four OR one" 
      {1 3 5 7 9 11 13 15 17 19 21 23 24 25 26 27 28 29 30 31}

  4 "five AND (four OR one)" {17 19 21 23 24 25 26 27 28 29 30 31}

  5 "five NOT (four OR one)" {16 18 20 22}

  6 "(five NOT (four OR one)) OR (five AND (four OR one))"
      {16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31}

  7 "(five OR one) AND two AND three" {7 15 22 23 30 31}

  8 "five OR one AND two AND three" 
    {7 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31}

  9 "five OR one two three" 
    {7 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31}

  10 "five OR \"one two three\"" 
    {7 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31}

  11 "one two OR four five NOT three" {3 7 11 15 19 23 24 25 26 27 31}

  12 "(one two OR four five) NOT three" {3 11 19 24 25 26 27}

  13 "((((((one two OR four five)))))) NOT three" {3 11 19 24 25 26 27}

} {
  do_test fts3expr-6.1.$id {
    execsql { SELECT rowid FROM t1 WHERE t1 MATCH $expr ORDER BY rowid }
  } $res
}

set sqlite_fts3_enable_parentheses 0
foreach {id expr res} {
  1 "one -two three"  {5 13 21 29}
  2 "-two one three"  {5 13 21 29}
  3 "one three -two"  {5 13 21 29}
  4 "-one -two three" {4 12 20 28}
  5 "three -one -two" {4 12 20 28}
  6 "-one three -two" {4 12 20 28}
} {
  do_test fts3expr-6.2.$id {
    execsql { SELECT rowid FROM t1 WHERE t1 MATCH $expr ORDER BY rowid }
  } $res
}
set sqlite_fts3_enable_parentheses 1

do_test fts3expr-7.1 {
  execsql {
    CREATE VIRTUAL TABLE test USING fts3 (keyword);
    INSERT INTO test VALUES ('abc');
    SELECT * FROM test WHERE keyword MATCH '""';
  }
} {}


do_test fts3expr-8.0 { test_fts3expr "(blah)" } {PHRASE 3 0 blah}
do_test fts3expr-8.1 { test_fts3expr "(blah.)" } {PHRASE 3 0 blah}
do_test fts3expr-8.2 { test_fts3expr "(blah,)" } {PHRASE 3 0 blah}
do_test fts3expr-8.3 { test_fts3expr "(blah!)" } {PHRASE 3 0 blah}
do_test fts3expr-8.4 { test_fts3expr "(blah-)" } {PHRASE 3 0 blah}

do_test fts3expr-8.5 { test_fts3expr "((blah.))" } {PHRASE 3 0 blah}
do_test fts3expr-8.6 { test_fts3expr "(((blah,)))" } {PHRASE 3 0 blah}
do_test fts3expr-8.7 { test_fts3expr "((((blah!))))" } {PHRASE 3 0 blah}

do_test fts3expr-8.8 { test_fts3expr "(,(blah-),)" } {PHRASE 3 0 blah}

set sqlite_fts3_enable_parentheses 0

do_test fts3expr-9.1 {
  test_fts3expr "f (e NEAR/2 a)"
} {AND {PHRASE 3 0 f} {NEAR/2 {PHRASE 3 0 e} {PHRASE 3 0 a}}}

do_test fts3expr-10.1 { test_fts3expr "abc *" } {PHRASE 3 0 abc}
do_test fts3expr-10.2 { test_fts3expr "*" } {}
do_test fts3expr-10.3 { test_fts3expr "abc*" } {PHRASE 3 0 abc+}

finish_test
