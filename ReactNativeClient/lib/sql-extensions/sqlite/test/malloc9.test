# 2007 April 30
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file contains additional out-of-memory checks (see malloc.tcl)
# added to expose a bug in out-of-memory handling for sqlite3_prepare().
#
# $Id: malloc9.test,v 1.5 2008/04/04 12:21:26 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

# Only run these tests if memory debugging is turned on.
#
if {!$MEMDEBUG} {
   puts "Skipping malloc9 tests: not compiled with -DSQLITE_MEMDEBUG..."
   finish_test
   return
}


do_malloc_test malloc-9.1 -tclprep {
  set sql {CREATE TABLE t1(x)}
  set sqlbytes [string length $sql]
  append sql {; INSERT INTO t1 VALUES(1)}
} -tclbody {
  if {[catch {sqlite3_prepare db $sql $sqlbytes TAIL} STMT]} {
    set msg $STMT
    set STMT {}
    error $msg
  }
} -cleanup {
  if {$STMT!=""} {
    sqlite3_finalize $STMT
  }
}

# Ensure that no file descriptors were leaked.
do_test malloc9-99.X {
  catch {db close}
  set sqlite_open_file_count
} {0}

finish_test
