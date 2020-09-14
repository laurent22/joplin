# 2005 October 3
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#
# This file implements tests the ability of the library to open
# many different databases at the same time without leaking memory.
#
# $Id: manydb.test,v 1.4 2008/11/21 00:10:35 aswift Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

set N 300
# if we're using proxy locks, we use 5 filedescriptors for a db
# that is open and in the middle of writing changes, normally
# sqlite uses 3 (proxy locking adds the conch and the local lock)
set using_proxy 0
foreach {name value} [array get env SQLITE_FORCE_PROXY_LOCKING] {
  set using_proxy value
}
set num_fd_per_openwrite_db 3
if {$using_proxy>0} {
  set num_fd_per_openwrite_db 5
} 

# First test how many file descriptors are available for use. To open a
# database for writing SQLite requires 3 file descriptors (the database, the
# journal and the directory).
set filehandles {}
catch {
  for {set i 0} {$i<($N * 3)} {incr i} {
    lappend filehandles [open testfile.1 w]
  }
}
foreach fd $filehandles {
  close $fd
}
catch {
  forcedelete testfile.1
}
set N [expr $i / $num_fd_per_openwrite_db]

# Create a bunch of random database names
#
unset -nocomplain dbname
unset -nocomplain used
for {set i 0} {$i<$N} {incr i} {
  while 1 {
    set name test-[format %08x [expr {int(rand()*0x7fffffff)}]].db
    if {[info exists used($name)]} continue
    set dbname($i) $name
    set used($name) $i
    break
  }
}

# Create a bunch of databases
#
for {set i 0} {$i<$N} {incr i} {
  do_test manydb-1.$i {
    sqlite3 db$i $dbname($i)
    execsql {
       CREATE TABLE t1(a,b);
       BEGIN;
       INSERT INTO t1 VALUES(1,2);
    } db$i
  } {}
}

# Finish the transactions
#
for {set i 0} {$i<$N} {incr i} {
  do_test manydb-2.$i {
    execsql {
       COMMIT;
       SELECT * FROM t1;
    } db$i
  } {1 2}
}


# Close the databases and erase the files.
#
for {set i 0} {$i<$N} {incr i} {
  do_test manydb-3.$i {
    db$i close
    forcedelete $dbname($i)
  } {}
}




finish_test
