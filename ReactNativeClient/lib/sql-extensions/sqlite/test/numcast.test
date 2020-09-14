# 2013 March 20
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
# This particular file does testing of casting strings into numeric
# values.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

foreach enc {utf8 utf16le utf16be} {
  do_test numcast-$enc.0 {
    db close
    sqlite3 db :memory:
    db eval "PRAGMA encoding='$enc'"
    set x [db eval {PRAGMA encoding}]
    string map {- {}} [string tolower $x]
  } $enc
  foreach {idx str rval ival} {
     1 12345.0       12345.0    12345
     2 12345.0e0     12345.0    12345
     3 -12345.0e0   -12345.0   -12345
     4 -12345.25    -12345.25  -12345
     5 { -12345.0}  -12345.0   -12345
     6 { 876xyz}       876.0      876
     7 { 456ķ89}       456.0      456
     8 { Ġ 321.5}        0.0        0
  } {
    do_test numcast-$enc.$idx.1 {
      db eval {SELECT CAST($str AS real)}
    } $rval
    do_test numcast-$enc.$idx.2 {
      db eval {SELECT CAST($str AS integer)}
    } $ival
  }
}

finish_test
