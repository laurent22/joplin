# 2007 May 1
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
# $Id: incrblob_err.test,v 1.14 2008/07/18 17:16:27 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix incrblob_err

ifcapable {!incrblob  || !tclvar} {
  finish_test
  return
}

source $testdir/malloc_common.tcl

unset -nocomplain ::fd ::data
set ::fd [open $::cmdlinearg(INFO_SCRIPT)]
set ::data [read $::fd]
close $::fd

do_malloc_test 1 -tclprep {
  set bytes [file size $::cmdlinearg(INFO_SCRIPT)]
  execsql {
    CREATE TABLE blobs(k, v BLOB);
    INSERT INTO blobs VALUES(1, zeroblob($::bytes));
  }
} -tclbody {
  set ::blob [db incrblob blobs v 1]
  fconfigure $::blob -translation binary
  set rc [catch {puts -nonewline $::blob $::data}]
  if {$rc} { error "out of memory" }
} 

do_malloc_test 2 -tclprep {
  execsql {
    CREATE TABLE blobs(k, v BLOB);
    INSERT INTO blobs VALUES(1, $::data);
  }
} -tclbody {
  set ::blob [db incrblob blobs v 1]
  set rc [catch {set ::r [read $::blob]}]
  if {$rc} { 
    error "out of memory" 
  } elseif {$::r ne $::data} {
    error "Bad data read..."
  }
}

do_malloc_test 3 -tclprep {
  execsql {
    CREATE TABLE blobs(k, v BLOB);
    INSERT INTO blobs VALUES(1, $::data);
  }
} -tclbody {
  set ::blob [db incrblob blobs v 1]
  set rc [catch {set ::r [read $::blob]}]
  if {$rc} { 
    error "out of memory" 
  } elseif {$::r ne $::data} {
    error "Bad data read..."
  }
  set rc [catch {close $::blob}]
  if {$rc} { 
    error "out of memory" 
  }
}

do_ioerr_test incrblob_err-4 -cksum 1 -sqlprep {
  CREATE TABLE blobs(k, v BLOB);
  INSERT INTO blobs VALUES(1, $::data);
} -tclbody {
  set ::blob [db incrblob blobs v 1]
  read $::blob
}

do_ioerr_test incrblob_err-5 -cksum 1 -sqlprep {
  CREATE TABLE blobs(k, v BLOB);
  INSERT INTO blobs VALUES(1, zeroblob(length(CAST($::data AS BLOB))));
} -tclbody {
  set ::blob [db incrblob blobs v 1]
  fconfigure $::blob -translation binary
  puts -nonewline $::blob $::data
  close $::blob
}

do_ioerr_test incrblob_err-6 -cksum 1 -sqlprep {
  CREATE TABLE blobs(k, v BLOB);
  INSERT INTO blobs VALUES(1, $::data || $::data || $::data);
} -tclbody {
  set ::blob [db incrblob blobs v 1]
  fconfigure $::blob -translation binary
  seek $::blob -20 end
  puts -nonewline $::blob "12345678900987654321"
  close $::blob
}

do_ioerr_test incrblob_err-7 -cksum 1 -sqlprep {
  PRAGMA auto_vacuum = 1;
  CREATE TABLE blobs(k INTEGER PRIMARY KEY, v BLOB);
  INSERT INTO blobs VALUES(1, zeroblob(500 * 1020));
} -tclbody {
  # Read some data from the end of the large blob inserted into table 
  # "blobs". This forces the IO error to occur while reading a pointer
  # map page for the purposes of seeking to the end of the blob.
  #
  sqlite3 db2 test.db
  set ::blob [db2 incrblob blobs v 1]
  sqlite3_blob_read $::blob [expr 500*1020-20] 20
  close $::blob
}
catch {db2 close}

do_ioerr_test incrblob_err-8 -cksum 1 -sqlprep {
  PRAGMA auto_vacuum = 1;
  CREATE TABLE blobs(k INTEGER PRIMARY KEY, v BLOB);
  INSERT INTO blobs VALUES(1, zeroblob(500 * 1020));
} -tclbody {
  # Read some data from the end of the large blob inserted into table 
  # "blobs". This forces the IO error to occur while reading a pointer
  # map page for the purposes of seeking to the end of the blob.
  #
  sqlite3 db2 test.db
  set ::blob [db2 incrblob blobs v 1]
  sqlite3_blob_write $::blob [expr 500*1020-20] 12345678900987654321
  close $::blob
}

catch {db2 close}

finish_test
