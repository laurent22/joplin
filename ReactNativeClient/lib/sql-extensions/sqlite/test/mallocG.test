# 2007 Aug 29
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
# This test script checks malloc failures in various obscure operations.
# 
# $Id: mallocG.test,v 1.5 2008/08/01 18:47:02 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

# Only run these tests if memory debugging is turned on.
#
if {!$MEMDEBUG} {
   puts "Skipping mallocG tests: not compiled with -DSQLITE_MEMDEBUG..."
   finish_test
   return
}

# Malloc failures while opening a database connection.
#
do_malloc_test mallocG-1 -tclbody {
  db close
  sqlite3 db test.db
}

do_malloc_test mallocG-2 -sqlprep {
  CREATE TABLE t1(x, y);
  CREATE TABLE t2(x INTEGER PRIMARY KEY);
} -sqlbody {
  SELECT y FROM t1 WHERE x IN t2;
}

do_malloc_test mallocG-3 -sqlprep {
  CREATE TABLE t1(x UNIQUE);
  INSERT INTO t1 VALUES ('hello');
  INSERT INTO t1 VALUES ('out there');
} -sqlbody {
  SELECT * FROM t1
   WHERE x BETWEEN 'a' AND 'z'
     AND x BETWEEN 'c' AND 'w'
     AND x BETWEEN 'e' AND 'u'
     AND x BETWEEN 'g' AND 'r'
     AND x BETWEEN 'i' AND 'q'
     AND x BETWEEN 'i' AND 'm'
}

ifcapable !utf16 {
  finish_test
  return
}

proc utf16 {utf8} {
  set utf16 [encoding convertto unicode $utf8]
  append utf16 "\x00\x00"
  return $utf16
}

do_malloc_test mallocG-4 -tclbody {
  set rc [sqlite3_complete16 [utf16 "SELECT * FROM t1;"]]
  if {$rc==1} {set rc 0} {error "out of memory"}
  set rc
}

finish_test
