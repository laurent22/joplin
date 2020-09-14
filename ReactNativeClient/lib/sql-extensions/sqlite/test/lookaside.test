# 2008 August 01
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
# Tests for the lookaside memory allocator.
#
# $Id: lookaside.test,v 1.10 2009/04/09 01:23:49 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !lookaside {
  finish_test
  return
}

# The tests in this file configure the lookaside allocator after a 
# connection is opened. This will not work if there is any "presql"
# configured (SQL run within the [sqlite3] wrapper in tester.tcl).
if {[info exists ::G(perm:dbconfig)] && $::G(perm:dbconfig)!=""} {
  finish_test
  return
}

test_set_config_pagecache 0 0

catch {db close}
sqlite3_shutdown
sqlite3_initialize
autoinstall_test_functions

sqlite3 db test.db
db cache size 4

# Make sure sqlite3_db_config() and sqlite3_db_status are working.
#
do_test lookaside-1.1 {
  catch {sqlite3_config_error db}
} {0}

do_test lookaside-1.2 {
  sqlite3_db_config_lookaside db 1 18 18
} {0}
do_test lookaside-1.3.1 {
  sqlite3_db_status db DBSTATUS_LOOKASIDE_USED 0
} {0 0 0}
do_test lookaside-1.3.2 {
  sqlite3_db_status db DBSTATUS_LOOKASIDE_HIT 0
} {0 0 0}
do_test lookaside-1.3.3 {
  sqlite3_db_status db DBSTATUS_LOOKASIDE_MISS_SIZE 0
} {0 0 0}
do_test lookaside-1.3.4 {
  sqlite3_db_status db DBSTATUS_LOOKASIDE_MISS_FULL 0
} {0 0 0}

do_test lookaside-1.4 {
  db eval {CREATE TABLE t1(w,x,y,z);}
  foreach {x y z} [sqlite3_db_status db DBSTATUS_LOOKASIDE_USED 0] break
  set p [lindex [sqlite3_db_status db DBSTATUS_LOOKASIDE_HIT 0] 2]
  set q [lindex [sqlite3_db_status db DBSTATUS_LOOKASIDE_MISS_SIZE 0] 2]
  set r [lindex [sqlite3_db_status db DBSTATUS_LOOKASIDE_MISS_FULL 0] 2]
  expr {$x==0 && $y<$z && $z==18 && $p>0 && $q>0 && $r>0}
} {0}
do_test lookaside-1.5 {
  foreach {x y z} [sqlite3_db_status db DBSTATUS_LOOKASIDE_USED 1] break
  expr {$x==0 && $y<$z && $z==18}
} {0}
do_test lookaside-1.6 {
  foreach {x y z} [sqlite3_db_status db DBSTATUS_LOOKASIDE_USED 0] break
  expr {$x==0 && $y==$z && $y<18}
} {1}
do_test lookaside-1.7 {
  db cache flush
  foreach {x y z} [sqlite3_db_status db DBSTATUS_LOOKASIDE_USED 0] break
  expr {$x==0 && $y==0 && $z<18}
} {1}
do_test lookaside-1.8 {
  db cache flush
  foreach {x y z} [sqlite3_db_status db DBSTATUS_LOOKASIDE_USED 1] break
  expr {$x==0 && $y==0 && $z<18}
} {1}
do_test lookaside-1.9 {
  db cache flush
  sqlite3_db_status db DBSTATUS_LOOKASIDE_USED 0
} {0 0 0}

do_test lookaside-2.1 {
  sqlite3_db_config_lookaside db 0 100 1000
} {0}
do_test lookaside-2.2 {
  db eval {CREATE TABLE t2(x);}
  foreach {x y z} [sqlite3_db_status db DBSTATUS_LOOKASIDE_USED 0] break
  expr {$x==0 && $y<$z && $z>10 && $z<100}
} {1}
do_test lookaside-2.3 {
  db eval {SELECT 1}
  sqlite3_db_config_lookaside db 0 50 50
} {5}  ;# SQLITE_BUSY
do_test lookaside-2.4 {
  db cache flush
  sqlite3_db_config_lookaside db 0 50 50
} {0}  ;# SQLITE_OK
do_test lookaside-2.5 {
  sqlite3_db_config_lookaside db 0 -1 50
} {0}  ;# SQLITE_OK
do_test lookaside-2.6 {
  sqlite3_db_config_lookaside db 0 50 -1
} {0}  ;# SQLITE_OK

# sqlite3_db_status() with an invalid verb returns an error.
#
do_test lookaside-3.1 {
  sqlite3_db_status db 99999 0
} {1 0 0}

# Test that an invalid verb on sqlite3_config() is detected and
# reported as an error.
#
do_test lookaside-4.1 {
  db close
  sqlite3_shutdown
  catch sqlite3_config_error
} {0}
sqlite3_initialize
autoinstall_test_functions

test_restore_config_pagecache
finish_test
