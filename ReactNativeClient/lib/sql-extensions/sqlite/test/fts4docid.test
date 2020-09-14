# 2012 March 26
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/fts3_common.tcl
set ::testprefix fts4docid

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 {
  finish_test
  return
}

# Initialize a table with pseudo-randomly generated data.
#
do_execsql_test 1.0 { CREATE VIRTUAL TABLE t1 USING fts4; }
do_test 1.1 {
  foreach {docid content} {
    0  {F N K B T I K V B A}    1  {D M J E S P H E L O}
    2  {W U T Q T Q T L H G}    3  {D W H M B R S Z B K}
    4  {F Q I N P Q J L Z D}    5  {J O Q E Y A O E L B}
    6  {O V R A C R K C Y H}    7  {Z J H T Q Q O R A G}
    8  {L K J W G D Y W B M}    9  {K E Y I A Q R Q T S}
    10 {N P H Y Z M R T I C}    11 {E X H O I S E S Z F}
    12 {B Y Q T J X C L L J}    13 {Q D C U U A Q E Z U}
    14 {S I T C J R X S J M}    15 {M X M K E X L H Q Y}
    16 {O W E I C H U Y S Y}    17 {P V V E M T H C C S}
    18 {L Y A M I E N M X O}    19 {S Y R U L S Q Y F P}
    20 {U J S T T J J S V X}    21 {T E I W P O V A A P}
    22 {W D K H D H F G O J}    23 {T X Y P G M J U I L}
    24 {F V X E B C N B K W}    25 {E B A Y N N T Z I C}
    26 {G E E B C P U D H G}    27 {J D J K N S B Q T M}
    28 {Q T G M D O D Y V G}    29 {P X W I W V P W Z G}
  } {
    execsql { INSERT INTO t1(docid, content) VALUES($docid, $content) }
  }
} {}

# Quick test regarding affinites and the docid/rowid column.
do_execsql_test 2.1.1 { SELECT docid FROM t1 WHERE docid = 5 } {5}
do_execsql_test 2.1.2 { SELECT docid FROM t1 WHERE docid = '5' } {5}
do_execsql_test 2.1.3 { SELECT docid FROM t1 WHERE docid = +5 } {5}
do_execsql_test 2.1.4 { SELECT docid FROM t1 WHERE docid = +'5' } {5}
do_execsql_test 2.1.5 { SELECT docid FROM t1 WHERE docid < 5 } {0 1 2 3 4}
do_execsql_test 2.1.6 { SELECT docid FROM t1 WHERE docid < '5' } {0 1 2 3 4}

do_execsql_test 2.2.1 { SELECT rowid FROM t1 WHERE rowid = 5 } {5}
do_execsql_test 2.2.2 { SELECT rowid FROM t1 WHERE rowid = '5' } {5}
do_execsql_test 2.2.3 { SELECT rowid FROM t1 WHERE rowid = +5 } {5}
do_execsql_test 2.2.4 { SELECT rowid FROM t1 WHERE rowid = +'5' } {5}
do_execsql_test 2.2.5 { SELECT rowid FROM t1 WHERE rowid < 5 } {0 1 2 3 4}
do_execsql_test 2.2.6 { SELECT rowid FROM t1 WHERE rowid < '5' } {0 1 2 3 4}

#-------------------------------------------------------------------------
# Now test a bunch of full-text queries featuring range constraints on
# the docid field. Each query is run so that the range constraint:
#
#   * is on the docid field,
#   * is on the docid field with a unary +,
#   * is on the rowid field,
#   * is on the rowid field with a unary +.
#
# Queries are run with both "ORDER BY docid DESC" and "ORDER BY docid ASC"
# clauses.
#
foreach {tn where result} {
  1 {WHERE t1 MATCH 'O' AND xxx < 17}                {1 5 6 7 11 16}
  2 {WHERE t1 MATCH 'O' AND xxx < 4123456789123456}  {1 5 6 7 11 16 18 21 22 28}
  3 {WHERE t1 MATCH 'O' AND xxx < 1}                 {}
  4 {WHERE t1 MATCH 'O' AND xxx < -4123456789123456} {}

  5 {WHERE t1 MATCH 'O' AND xxx > 17}                {18 21 22 28}
  6 {WHERE t1 MATCH 'O' AND xxx > 4123456789123456}  {}
  7 {WHERE t1 MATCH 'O' AND xxx > 1}                 {5 6 7 11 16 18 21 22 28}
  8 {WHERE t1 MATCH 'O' AND xxx > -4123456789123456} {1 5 6 7 11 16 18 21 22 28}

  9 {WHERE t1 MATCH '"Q T"' AND xxx < 27}  {2 9 12}
  10 {WHERE t1 MATCH '"Q T"' AND xxx <= 27} {2 9 12 27}
  11 {WHERE t1 MATCH '"Q T"' AND xxx > 27}  {28}
  12 {WHERE t1 MATCH '"Q T"' AND xxx >= 27} {27 28}
} {
  foreach {tn2 ref order} {
    1  docid "ORDER BY docid ASC"
    2 +docid "ORDER BY docid ASC"
    3  rowid "ORDER BY docid ASC"
    4 +rowid "ORDER BY docid ASC"

    5  docid "ORDER BY docid DESC"
    6 +docid "ORDER BY docid DESC"
    7  rowid "ORDER BY docid DESC"
    8 +rowid "ORDER BY docid DESC"
  } {
    set w [string map "xxx $ref" $where]
    set q "SELECT docid FROM t1 $w $order"

    if {$tn2<5} {
      set r [lsort -integer -increasing $result] 
    } else {
      set r [lsort -integer -decreasing $result] 
    }

    do_execsql_test 3.$tn.$tn2 $q $r
  }
}

finish_test
