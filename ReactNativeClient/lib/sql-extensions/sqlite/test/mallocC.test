# 2007 Aug 13
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
# This file tests aspects of the malloc failure while parsing
# CREATE TABLE statements in auto_vacuum mode.
#
# $Id: mallocC.test,v 1.10 2009/04/11 16:27:50 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

# Only run these tests if memory debugging is turned on.
#
if {!$MEMDEBUG} {
   puts "Skipping mallocC tests: not compiled with -DSQLITE_MEMDEBUG..."
   finish_test
   return
}

proc do_mallocC_test {tn args} {
  array set ::mallocopts $args
  #set sum [allcksum db]

  for {set ::n 1} {true} {incr ::n} {

    # Run the SQL. Malloc number $::n is set to fail. A malloc() failure
    # may or may not be reported.
    sqlite3_memdebug_fail $::n -repeat 1
    do_test mallocC-$tn.$::n.1 {
      set res [catchsql [string trim $::mallocopts(-sql)]]
      set rc [expr { 
        0==[string compare $res {1 {out of memory}}] ||
        [db errorcode] == 3082 ||
        0==[lindex $res 0]
      }]
      if {$rc!=1} {
        puts "Error: $res"
      }
      set rc
    } {1}

    # If $::n is greater than the number of malloc() calls required to
    # execute the SQL, then this test is finished. Break out of the loop.
    set nFail [sqlite3_memdebug_fail -1]
    if {$nFail==0} {
      break
    }

    # Recover from the malloc failure.
    #
    # Update: The new malloc() failure handling means that a transaction may
    # still be active even if a malloc() has failed. But when these tests were
    # written this was not the case. So do a manual ROLLBACK here so that the
    # tests pass.
    do_test mallocC-$tn.$::n.2 {
      catch {
        execsql {
          ROLLBACK;
        }
      }
      expr 0
    } {0}

    # Checksum the database.
    #do_test mallocC-$tn.$::n.3 {
    #  allcksum db
    #} $sum

    #integrity_check mallocC-$tn.$::n.4
  }
  unset ::mallocopts
}

sqlite3_extended_result_codes db 1

execsql {
  PRAGMA auto_vacuum=1;
  CREATE TABLE t0(a, b, c);
}

# The number of memory allocation failures is different on 64-bit
# and 32-bit systems due to larger structures on 64-bit systems
# overflowing the lookaside more often.  To debug problems, it is
# sometimes helpful to reduce the size of the lookaside allocation
# blocks.  But this is normally disabled.
#
if {0} {
  db close
  sqlite3_shutdown
  sqlite3_config_lookaside 50 500
  sqlite3_initialize
  autoinstall_test_functions
  sqlite3 db test.db
}

do_mallocC_test 1 -sql {
  BEGIN;
  -- Allocate 32 new root pages. This will exercise the 'extract specific 
  -- page from the freelist' code when in auto-vacuum mode (see the
  -- allocatePage() routine in btree.c).
  CREATE TABLE t1(a UNIQUE, b UNIQUE, c UNIQUE);
  CREATE TABLE t2(a UNIQUE, b UNIQUE, c UNIQUE);
  CREATE TABLE t3(a UNIQUE, b UNIQUE, c UNIQUE);
  CREATE TABLE t4(a UNIQUE, b UNIQUE, c UNIQUE);
  CREATE TABLE t5(a UNIQUE, b UNIQUE, c UNIQUE);
  CREATE TABLE t6(a UNIQUE, b UNIQUE, c UNIQUE);
  CREATE TABLE t7(a UNIQUE, b UNIQUE, c UNIQUE);
  CREATE TABLE t8(a UNIQUE, b UNIQUE, c UNIQUE);

  ROLLBACK;
}

finish_test
