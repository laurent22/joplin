# 2007 April 27
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
# The focus of the tests in this file are to verify that the
# underlying TEXT or BLOB representation of an sqlite3_value
# changes appropriately when APIs from the following set are
# called:
#
#     sqlite3_value_text()
#     sqlite3_value_text16()
#     sqlite3_value_blob()
#     sqlite3_value_bytes()
#     sqlite3_value_bytes16()
#
# $Id: ptrchng.test,v 1.5 2008/07/12 14:52:20 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !bloblit {
  finish_test
  return
}

# Register the "pointer_change" SQL function.
#
sqlite3_create_function db

do_test ptrchng-1.1 {
  execsql {
    CREATE TABLE t1(x INTEGER PRIMARY KEY, y BLOB);
    INSERT INTO t1 VALUES(1, 'abc');
    INSERT INTO t1 VALUES(2, 
       'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01234356789');
    INSERT INTO t1 VALUES(3, x'626c6f62');
    INSERT INTO t1 VALUES(4,
 x'000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f2021222324'
    );
    SELECT count(*) FROM t1;
  }
} {4}

# For the short entries that fit in the Mem.zBuf[], the pointer should
# never change regardless of what type conversions occur.
#
# UPDATE: No longer true, as Mem.zBuf[] has been removed.
#
do_test ptrchng-2.1 {
  execsql {
    SELECT pointer_change(y, 'text', 'noop', 'blob') FROM t1 WHERE x=1
  }
} {0}
do_test ptrchng-2.2 {
  execsql {
    SELECT pointer_change(y, 'blob', 'noop', 'text') FROM t1 WHERE x=1
  }
} {0}
ifcapable utf16 {
  do_test ptrchng-2.3 {
    execsql {
      SELECT pointer_change(y, 'text', 'noop', 'text16') FROM t1 WHERE x=1
    }
  } {1}
  do_test ptrchng-2.4 {
    execsql {
      SELECT pointer_change(y, 'blob', 'noop', 'text16') FROM t1 WHERE x=1
    }
  } {1}
  do_test ptrchng-2.5 {
    execsql {
      SELECT pointer_change(y, 'text16', 'noop', 'blob') FROM t1 WHERE x=1
    }
  } {0}
  do_test ptrchng-2.6 {
    execsql {
      SELECT pointer_change(y, 'text16', 'noop', 'text') FROM t1 WHERE x=1
    }
  } {1}
}
do_test ptrchng-2.11 {
  execsql {
    SELECT pointer_change(y, 'text', 'noop', 'blob') FROM t1 WHERE x=3
  }
} {0}
do_test ptrchng-2.12 {
  execsql {
    SELECT pointer_change(y, 'blob', 'noop', 'text') FROM t1 WHERE x=3
  }
} {0}
ifcapable utf16 {
  do_test ptrchng-2.13 {
    execsql {
      SELECT pointer_change(y, 'text', 'noop', 'text16') FROM t1 WHERE x=3
    }
  } {1}
  do_test ptrchng-2.14 {
    execsql {
      SELECT pointer_change(y, 'blob', 'noop', 'text16') FROM t1 WHERE x=3
    }
  } {1}
  do_test ptrchng-2.15 {
    execsql {
      SELECT pointer_change(y, 'text16', 'noop', 'blob') FROM t1 WHERE x=3
    }
  } {0}
  do_test ptrchng-2.16 {
    execsql {
      SELECT pointer_change(y, 'text16', 'noop', 'text') FROM t1 WHERE x=3
    }
  } {1}
}

# For the long entries that do not fit in the Mem.zBuf[], the pointer
# should change sometimes.
#
do_test ptrchng-3.1 {
  execsql {
    SELECT pointer_change(y, 'text', 'noop', 'blob') FROM t1 WHERE x=2
  }
} {0}
do_test ptrchng-3.2 {
  execsql {
    SELECT pointer_change(y, 'blob', 'noop', 'text') FROM t1 WHERE x=2
  }
} {0}
ifcapable utf16 {
  do_test ptrchng-3.3 {
    execsql {
      SELECT pointer_change(y, 'text', 'noop', 'text16') FROM t1 WHERE x=2
    }
  } {1}
  do_test ptrchng-3.4 {
    execsql {
      SELECT pointer_change(y, 'blob', 'noop', 'text16') FROM t1 WHERE x=2
    }
  } {1}
  do_test ptrchng-3.5 {
    execsql {
      SELECT pointer_change(y, 'text16', 'noop', 'blob') FROM t1 WHERE x=2
    }
  } {0}
  do_test ptrchng-3.6 {
    execsql {
      SELECT pointer_change(y, 'text16', 'noop', 'text') FROM t1 WHERE x=2
    }
  } {1}
}
do_test ptrchng-3.11 {
  execsql {
    SELECT pointer_change(y, 'text', 'noop', 'blob') FROM t1 WHERE x=4
  }
} {0}
do_test ptrchng-3.12 {
  execsql {
    SELECT pointer_change(y, 'blob', 'noop', 'text') FROM t1 WHERE x=4
  }
} {0}
ifcapable utf16 {
  do_test ptrchng-3.13 {
    execsql {
      SELECT pointer_change(y, 'text', 'noop', 'text16') FROM t1 WHERE x=4
    }
  } {1}
  do_test ptrchng-3.14 {
    execsql {
      SELECT pointer_change(y, 'blob', 'noop', 'text16') FROM t1 WHERE x=4
    }
  } {1}
  do_test ptrchng-3.15 {
    execsql {
      SELECT pointer_change(y, 'text16', 'noop', 'blob') FROM t1 WHERE x=4
    }
  } {0}
  do_test ptrchng-3.16 {
    execsql {
      SELECT pointer_change(y, 'text16', 'noop', 'text') FROM t1 WHERE x=4
    }
  } {1}
}

# A call to _bytes() should never reformat a _text() or _blob().
#
do_test ptrchng-4.1 {
  execsql {
    SELECT pointer_change(y, 'text', 'bytes', 'text') FROM t1
  }
} {0 0 0 0}
do_test ptrchng-4.2 {
  execsql {
    SELECT pointer_change(y, 'blob', 'bytes', 'blob') FROM t1
  }
} {0 0 0 0}

# A call to _blob() should never trigger a reformat
#
do_test ptrchng-5.1 {
  execsql {
    SELECT pointer_change(y, 'text', 'bytes', 'blob') FROM t1
  }
} {0 0 0 0}
ifcapable utf16 {
  do_test ptrchng-5.2 {
    execsql {
      SELECT pointer_change(y, 'text16', 'noop', 'blob') FROM t1
    }
  } {0 0 0 0}
  do_test ptrchng-5.3 {
    execsql {
      SELECT pointer_change(y, 'text16', 'bytes16', 'blob') FROM t1
    }
  } {0 0 0 0}
}

finish_test
