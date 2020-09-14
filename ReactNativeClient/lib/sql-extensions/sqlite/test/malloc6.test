# 2006 June 25
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file attempts to check the library in an out-of-memory situation.
#
# $Id: malloc6.test,v 1.5 2008/02/18 22:24:58 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

# Only run these tests if memory debugging is turned on.
#
if {!$MEMDEBUG} {
   puts "Skipping malloc6 tests: not compiled with -DSQLITE_MEMDEBUG..."
   finish_test
   return
}


set sqlite_os_trace 0
do_malloc_test malloc6-1 -tclprep {
  db close
} -tclbody {
  if {[catch {sqlite3 db test.db}]} {
    error "out of memory"
  }
  sqlite3_extended_result_codes db 1
} -sqlbody {
  DROP TABLE IF EXISTS t1;
  CREATE TABLE IF NOT EXISTS t1(
     a int, b float, c double, d text, e varchar(20),
     primary key(a,b,c)
  );
  CREATE TABLE IF NOT EXISTS t1(
     a int, b float, c double, d text, e varchar(20),
     primary key(a,b,c)
  );
  DROP TABLE IF EXISTS t1;
} 

# Ensure that no file descriptors were leaked.
do_test malloc6-1.X {
  catch {db close}
  set sqlite_open_file_count
} {0}

finish_test
