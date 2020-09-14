# 2006 July 26
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
# added to expose a bug in out-of-memory handling for sqlite3_prepare16().
#
# $Id: malloc7.test,v 1.5 2008/02/18 22:24:58 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

# Only run these tests if memory debugging is turned on.
#
if {!$MEMDEBUG} {
   puts "Skipping malloc7 tests: not compiled with -DSQLITE_MEMDEBUG..."
   finish_test
   return
}


do_malloc_test malloc7-1 -sqlprep {
  CREATE TABLE t1(a,b,c,d);
  CREATE INDEX i1 ON t1(b,c);
} -tclbody {
  set sql16 [encoding convertto unicode "SELECT * FROM sqlite_master"]
  append sql16 "\00\00"
  set nbyte [string length $sql16]
  set ::STMT [sqlite3_prepare16 db $sql16 $nbyte DUMMY]
  sqlite3_finalize $::STMT
} 


# Ensure that no file descriptors were leaked.
do_test malloc-99.X {
  catch {db close}
  set sqlite_open_file_count
} {0}

puts open-file-count=$sqlite_open_file_count
finish_test
