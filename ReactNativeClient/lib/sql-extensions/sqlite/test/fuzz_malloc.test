#
# 2007 May 10
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file tests malloc failures in concert with fuzzy SQL generation.
#
# $Id: fuzz_malloc.test,v 1.10 2008/08/20 16:35:10 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

source $testdir/malloc_common.tcl
source $testdir/fuzz_common.tcl

if {[info exists G(isquick)]} {
  set ::REPEATS 20
} elseif {[info exists G(issoak)]} {
  set ::REPEATS 100
} else {
  set ::REPEATS 40
}

#
# Usage: do_fuzzy_malloc_test <testname> ?<options>?
# 
#     -template
#     -sqlprep
#     -repeats
#     
proc do_fuzzy_malloc_test {testname args} {
  set ::fuzzyopts(-repeats) $::REPEATS
  set ::fuzzyopts(-sqlprep) {}
  array set ::fuzzyopts $args

  sqlite3_memdebug_fail -1
  db close
  delete_file test.db test.db-journal
  sqlite3 db test.db
  set ::prep $::fuzzyopts(-sqlprep)
  execsql $::prep
  set jj 0
  for {set ii 0} {$ii < $::fuzzyopts(-repeats)} {incr ii} {
    expr srand($jj)
    incr jj
    set ::sql [subst $::fuzzyopts(-template)]
    # puts fuzyy-sql=\[$::sql\]; flush stdout
    foreach {rc ::fmtres} [catchsql "$::sql"] {}
    if {$rc==0} {
      set nErr1 [set_test_counter errors]
      do_faultsim_test $testname-$ii -faults oom* -body {
        execsql $::sql
      } -test {
        if {$testrc && $testresult!="datatype mismatch"} { 
          faultsim_test_result {0 {}}
        }
      }
      if {[set_test_counter errors]>$nErr1} {
        puts "Previous fuzzy-sql=\[$::sql\]"
        flush stdout
      }
    } else {
      incr ii -1
    }
  }
}

#----------------------------------------------------------------
# Test malloc failure during parsing (and execution) of a fuzzily 
# generated expressions.
#
do_fuzzy_malloc_test fuzzy_malloc-1 -template {Select [Expr]}
do_fuzzy_malloc_test fuzzy_malloc-2 -template {[Select]}

set ::SQLPREP {
  BEGIN;
    CREATE TABLE abc(a, b, c);
    CREATE TABLE def(a, b, c);
    CREATE TABLE ghi(a, b, c);
    INSERT INTO abc VALUES(1.5, 3, 'a short string');
    INSERT INTO def VALUES(NULL, X'ABCDEF', 
        'a longer string. Long enough that it doesn''t fit in Mem.zShort');
    INSERT INTO ghi VALUES(zeroblob(1000), 'hello world', -1257900987654321);
  COMMIT;
}
set ::TableList  [list abc def ghi]
set ::ColumnList [list a b c]

do_fuzzy_malloc_test fuzzy_malloc-3 \
  -template {[Select]}              \
  -sqlprep $::SQLPREP

finish_test
