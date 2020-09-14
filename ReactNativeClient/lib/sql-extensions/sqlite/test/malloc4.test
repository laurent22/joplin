# 2005 November 30
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
# This file contains tests to ensure that the library handles malloc() failures
# correctly. The emphasis in this file is on sqlite3_column_XXX() APIs.
#
# $Id: malloc4.test,v 1.10 2008/02/18 22:24:58 drh Exp $

#---------------------------------------------------------------------------
# NOTES ON EXPECTED BEHAVIOUR
#
# [193] When a memory allocation failure occurs during sqlite3_column_name(),
#       sqlite3_column_name16(), sqlite3_column_decltype(), or
#       sqlite3_column_decltype16() the function shall return NULL.
#
#---------------------------------------------------------------------------

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

# Only run these tests if memory debugging is turned on.
if {!$MEMDEBUG} {
   puts "Skipping malloc4 tests: not compiled with -DSQLITE_MEMDEBUG..."
   finish_test
   return
}

ifcapable !utf16 {
  finish_test
  return
}

proc do_stmt_test {id sql} {
  set ::sql $sql
  set go 1
  for {set n 0} {$go} {incr n} {
    set testid "malloc4-$id.$n"

    # Prepare the statement
    do_test ${testid}.1 {
      set ::STMT [sqlite3_prepare $::DB $sql -1 TAIL]
      expr [string length $::STMT] > 0
    } {1}

    # Set the Nth malloc() to fail.
    sqlite3_memdebug_fail $n -repeat 0

    # Test malloc failure in the _name(), _name16(), decltype() and
    # decltype16() APIs. Calls that occur after the malloc() failure should
    # return NULL. No error is raised though.
    #
    # ${testid}.2.1 - Call _name()
    # ${testid}.2.2 - Call _name16()
    # ${testid}.2.3 - Call _name()
    # ${testid}.2.4 - Check that the return values of the above three calls are
    #                 consistent with each other and with the simulated
    #                 malloc() failures.
    #
    # Because the code that implements the _decltype() and _decltype16() APIs
    # is the same as the _name() and _name16() implementations, we don't worry
    # about explicitly testing them.
    #
    do_test ${testid}.2.1 {
      set mf1 [expr [sqlite3_memdebug_pending] < 0]
      set ::name8  [sqlite3_column_name $::STMT 0]
      set mf2 [expr [sqlite3_memdebug_pending] < 0]
      expr {$mf1 == $mf2 || $::name8 == ""}
    } {1}
    do_test ${testid}.2.2 {
      set mf1 [expr [sqlite3_memdebug_pending] < 0]
      set ::name16 [sqlite3_column_name16 $::STMT 0]
      set ::name16 [encoding convertfrom unicode $::name16]
      set ::name16 [string range $::name16 0 end-1]
      set mf2 [expr [sqlite3_memdebug_pending] < 0]
      expr {$mf1 == $mf2 || $::name16 == ""}
    } {1}
    do_test ${testid}.2.3 {
      set mf1 [expr [sqlite3_memdebug_pending] < 0]
      set ::name8_2 [sqlite3_column_name $::STMT 0]
      set mf2 [expr [sqlite3_memdebug_pending] < 0]
      expr {$mf1 == $mf2 || $::name8_2 == ""}
    } {1}
    set ::mallocFailed [expr [sqlite3_memdebug_pending] < 0]
    do_test ${testid}.2.4 {
      expr {
        $::name8 == $::name8_2 && $::name16 == $::name8 && !$::mallocFailed ||
        $::name8 == $::name8_2 && $::name16 == "" &&        $::mallocFailed ||
        $::name8 == $::name16 && $::name8_2 == "" &&        $::mallocFailed ||
        $::name8_2 == $::name16 && $::name8 == "" &&        $::mallocFailed
      }
    } {1}

    # Step the statement so that we can call _text() and _text16().  Before
    # running sqlite3_step(), make sure that malloc() is not about to fail.
    # Memory allocation failures that occur within sqlite3_step() are tested
    # elsewhere.
    set mf [sqlite3_memdebug_pending]
    sqlite3_memdebug_fail -1
    do_test ${testid}.3 {
      sqlite3_step $::STMT
    } {SQLITE_ROW}
    sqlite3_memdebug_fail $mf

    # Test for malloc() failures within _text() and _text16().
    #
    do_test ${testid}.4.1 {
      set ::text8 [sqlite3_column_text $::STMT 0]
      set mf [expr [sqlite3_memdebug_pending] < 0 && !$::mallocFailed]
      expr {$mf==0 || $::text8 == ""}
    } {1}
    do_test ${testid}.4.2 {
      set ::text16 [sqlite3_column_text16 $::STMT 0]
      set ::text16 [encoding convertfrom unicode $::text16]
      set ::text16 [string range $::text16 0 end-1]
      set mf [expr [sqlite3_memdebug_pending] < 0 && !$::mallocFailed]
      expr {$mf==0 || $::text16 == ""}
    } {1}
    do_test ${testid}.4.3 {
      set ::text8_2 [sqlite3_column_text $::STMT 0]
      set mf [expr [sqlite3_memdebug_pending] < 0 && !$::mallocFailed]
      expr {$mf==0 || $::text8_2 == "" || ($::text16 == "" && $::text8 != "")}
    } {1}

    # Test for malloc() failures within _int(), _int64() and _real(). The only
    # way this can occur is if the string has to be translated from UTF-16 to
    # UTF-8 before being converted to a numeric value.
    do_test ${testid}.4.4.1 {
      set mf [sqlite3_memdebug_pending]
      sqlite3_memdebug_fail -1
      sqlite3_column_text16 $::STMT 0
      sqlite3_memdebug_fail $mf
      sqlite3_column_int $::STMT 0
    } {0}
    do_test ${testid}.4.5 {
      set mf [sqlite3_memdebug_pending]
      sqlite3_memdebug_fail -1
      sqlite3_column_text16 $::STMT 0
      sqlite3_memdebug_fail $mf
      sqlite3_column_int64 $::STMT 0
    } {0}

    do_test ${testid}.4.6 {
      set mf [sqlite3_memdebug_pending]
      sqlite3_memdebug_fail -1
      sqlite3_column_text16 $::STMT 0
      sqlite3_memdebug_fail $mf
      sqlite3_column_double $::STMT 0
    } {0.0}

    set mallocFailedAfterStep [expr \
      [sqlite3_memdebug_pending] < 0 && !$::mallocFailed
    ]

    sqlite3_memdebug_fail -1
    # Test that if a malloc() failed the next call to sqlite3_step() returns
    # SQLITE_ERROR. If malloc() did not fail, it should return SQLITE_DONE.
    #
    do_test ${testid}.5 {
      sqlite3_step $::STMT
    } [expr {$mallocFailedAfterStep ? "SQLITE_ERROR" : "SQLITE_DONE"}]

    do_test ${testid}.6 {
      sqlite3_finalize $::STMT
    } [expr {$mallocFailedAfterStep ? "SQLITE_NOMEM" : "SQLITE_OK"}]

    if {$::mallocFailed == 0 && $mallocFailedAfterStep == 0} {
      sqlite3_memdebug_fail -1
      set go 0
    }
  }
}

execsql {
  CREATE TABLE tbl(
    the_first_reasonably_long_column_name that_also_has_quite_a_lengthy_type
  );
  INSERT INTO tbl VALUES(
    'An extra long string. Far too long to be stored in NBFS bytes.'
  );
}

do_stmt_test 1 "SELECT * FROM tbl"

sqlite3_memdebug_fail -1
finish_test
