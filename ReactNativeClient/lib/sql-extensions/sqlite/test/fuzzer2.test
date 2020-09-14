# 2016 February 4
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# The focus of the tests is the word-fuzzer virtual table. The tests
# in this file are slower than those in fuzzer1.test. So this file does
# not run as part of veryquick.test etc.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab {
  finish_test
  return
}

set ::testprefix fuzzer2
load_static_extension db fuzzer

#-------------------------------------------------------------------------
# This test uses a fuzzer table with many rules. There is one rule to
# map each possible two character string, where characters are lower-case
# letters used in the English language, to all other possible two character
# strings. In total, (26^4)-(26^2) mappings (the subtracted term represents
# the no-op mappings discarded automatically by the fuzzer).
#
#
do_execsql_test 1.1.1 {
  DROP TABLE IF EXISTS x1;
  DROP TABLE IF EXISTS x1_rules;
  CREATE TABLE x1_rules(ruleset, cFrom, cTo, cost);
}
puts "This test is slow - perhaps around 7 seconds on an average pc"
do_test 1.1.2 {
  set LETTERS {a b c d e f g h i j k l m n o p q r s t u v w x y z}
  set cost 1
  db transaction {
    foreach c1 $LETTERS { 
      foreach c2 $LETTERS { 
        foreach c3 $LETTERS { 
          foreach c4 $LETTERS { 
            db eval {INSERT INTO x1_rules VALUES(0, $c1||$c2, $c3||$c4, $cost)}
            set cost [expr ($cost%1000) + 1]
          }
        }
      }
    }
    db eval {UPDATE x1_rules SET cost = 20 WHERE cost<20 AND cFrom!='xx'}
  }
} {}

do_execsql_test 1.2 {
  SELECT count(*) FROM x1_rules WHERE cTo!=cFrom;
} [expr 26*26*26*26 - 26*26]

do_execsql_test 1.2.1 {
  CREATE VIRTUAL TABLE x1 USING fuzzer(x1_rules);
  SELECT word FROM x1 WHERE word MATCH 'xx' LIMIT 10;
} {xx hw hx hy hz ia ib ic id ie}
do_execsql_test 1.2.2 {
  SELECT cTo FROM x1_rules WHERE cFrom='xx' 
  ORDER BY cost asc, rowid asc LIMIT 9;
} {hw hx hy hz ia ib ic id ie}

finish_test
