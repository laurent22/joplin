# 2006 August 23
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is automatic extension loading and the
# sqlite3_auto_extension() API.
#
# $Id: loadext2.test,v 1.3 2008/03/19 16:08:54 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Only run these tests if the approriate APIs are defined
# in the system under test.
#
ifcapable !load_ext {
  finish_test
  return
}
if {[info command sqlite3_auto_extension_sqr]==""} {
  finish_test
  return
}


# None of the extension are loaded by default.
#
do_test loadext2-1.1 {
  catchsql {
    SELECT sqr(2)
  }
} {1 {no such function: sqr}}
do_test loadext2-1.2 {
  catchsql {
    SELECT cube(2)
  }
} {1 {no such function: cube}}

# Extensions loaders not currently registered
#
do_test loadext2-1.2.1 {
  sqlite3_cancel_auto_extension_sqr
} {0}
do_test loadext2-1.2.2 {
  sqlite3_cancel_auto_extension_sqr
} {0}
do_test loadext2-1.2.3 {
  sqlite3_cancel_auto_extension_sqr
} {0}


# Register auto-loaders.  Still functions do not exist.
#
do_test loadext2-1.3 {
  sqlite3_auto_extension_sqr
  sqlite3_auto_extension_cube
  catchsql {
    SELECT sqr(2)
  }
} {1 {no such function: sqr}}
do_test loadext2-1.4 {
  catchsql {
    SELECT cube(2)
  }
} {1 {no such function: cube}}


# Functions do exist in a new database connection
#
do_test loadext2-1.5 {
  sqlite3 db test.db
  catchsql {
    SELECT sqr(2)
  }
} {0 4.0}
do_test loadext2-1.6 {
  catchsql {
    SELECT cube(2)
  }
} {0 8.0}


# Reset extension auto loading.  Existing extensions still exist.
#
do_test loadext2-1.7.1 {
  sqlite3_cancel_auto_extension_sqr
} {1}
do_test loadext2-1.7.2 {
  sqlite3_cancel_auto_extension_sqr
} {0}
do_test loadext2-1.7.3 {
  sqlite3_cancel_auto_extension_cube
} {1}
do_test loadext2-1.7.4 {
  sqlite3_cancel_auto_extension_cube
} {0}
do_test loadext2-1.7.5 {
  catchsql {
    SELECT sqr(2)
  }
} {0 4.0}
do_test loadext2-1.8 {
  catchsql {
    SELECT cube(2)
  }
} {0 8.0}


# Register only the sqr() function.
#
do_test loadext2-1.9 {
  sqlite3_auto_extension_sqr
  sqlite3 db test.db
  catchsql {
    SELECT sqr(2)
  }
} {0 4.0}
do_test loadext2-1.10 {
  catchsql {
    SELECT cube(2)
  }
} {1 {no such function: cube}}

# Register only the cube() function.
#
do_test loadext2-1.11 {
  sqlite3_reset_auto_extension
  sqlite3_auto_extension_cube
  sqlite3 db test.db
  catchsql {
    SELECT sqr(2)
  }
} {1 {no such function: sqr}}
do_test loadext2-1.12 {
  catchsql {
    SELECT cube(2)
  }
} {0 8.0}

# Register a broken entry point.
#
do_test loadext2-1.13 {
  sqlite3_auto_extension_broken
  set rc [catch {sqlite3 db test.db} errmsg]
  lappend rc $errmsg
} {1 {automatic extension loading failed: broken autoext!}}
do_test loadext2-1.14 {
  catchsql {
    SELECT sqr(2)
  }
} {1 {no such function: sqr}}
do_test loadext2-1.15 {
  catchsql {
    SELECT cube(2)
  }
} {0 8.0}


sqlite3_reset_auto_extension
autoinstall_test_functions
finish_test
