# 2003 September 6
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
# focus of this script testing the sqlite_bind API.
#
# $Id: bind.test,v 1.48 2009/07/22 07:27:57 danielk1977 Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

proc sqlite_step {stmt N VALS COLS} {
  upvar VALS vals
  upvar COLS cols
  set vals [list]
  set cols [list]

  set rc [sqlite3_step $stmt]
  for {set i 0} {$i < [sqlite3_column_count $stmt]} {incr i} {
    lappend cols [sqlite3_column_name $stmt $i]
  }
  for {set i 0} {$i < [sqlite3_data_count $stmt]} {incr i} {
    lappend vals [sqlite3_column_text $stmt $i]
  }

  return $rc
}

do_test bind-1.1 {
  set DB [sqlite3_connection_pointer db]
  execsql {CREATE TABLE t1(a,b,c);}
  set VM [sqlite3_prepare $DB {INSERT INTO t1 VALUES(:1,?,:abc)} -1 TAIL]
  set TAIL
} {}
do_test bind-1.1.1 {
  sqlite3_bind_parameter_count $VM
} 3
do_test bind-1.1.2 {
  sqlite3_bind_parameter_name $VM 1
} {:1}
do_test bind-1.1.3 {
  sqlite3_bind_parameter_name $VM 2
} {}
do_test bind-1.1.4 {
  sqlite3_bind_parameter_name $VM 3
} {:abc}
do_test bind-1.2 {
  sqlite_step $VM N VALUES COLNAMES
} {SQLITE_DONE}
do_test bind-1.3 {
  execsql {SELECT rowid, * FROM t1}
} {1 {} {} {}}
do_test bind-1.4 {
  sqlite3_reset $VM
  sqlite_bind $VM 1 {test value 1} normal
  sqlite_step $VM N VALUES COLNAMES
} SQLITE_DONE
do_test bind-1.5 {
  execsql {SELECT rowid, * FROM t1}
} {1 {} {} {} 2 {test value 1} {} {}}
do_test bind-1.6 {
  sqlite3_reset $VM
  sqlite_bind $VM 3 {'test value 2'} normal
  sqlite_step $VM N VALUES COLNAMES
} SQLITE_DONE
do_test bind-1.7 {
  execsql {SELECT rowid, * FROM t1}
} {1 {} {} {} 2 {test value 1} {} {} 3 {test value 1} {} {'test value 2'}}
do_test bind-1.8 {
  sqlite3_reset $VM
  set sqlite_static_bind_value 123
  sqlite_bind $VM 1 {} static
  sqlite_bind $VM 2 {abcdefg} normal
  sqlite_bind $VM 3 {} null
  execsql {DELETE FROM t1}
  sqlite_step $VM N VALUES COLNAMES
  execsql {SELECT rowid, * FROM t1}
} {1 123 abcdefg {}}
do_test bind-1.9 {
  sqlite3_reset $VM
  sqlite_bind $VM 1 {456} normal
  sqlite_step $VM N VALUES COLNAMES
  execsql {SELECT rowid, * FROM t1}
} {1 123 abcdefg {} 2 456 abcdefg {}}

do_test bind-1.10 {
   set rc [catch {
     sqlite3_prepare db {INSERT INTO t1 VALUES($abc:123,?,:abc)} -1 TAIL
   } msg]
   lappend rc $msg
} {1 {(1) near ":123": syntax error}}
do_test bind-1.11 {
   set rc [catch {
     sqlite3_prepare db {INSERT INTO t1 VALUES(@abc:xyz,?,:abc)} -1 TAIL
   } msg]
   lappend rc $msg
} {1 {(1) near ":xyz": syntax error}}

do_test bind-1.99 {
  sqlite3_finalize $VM
} SQLITE_OK

# Prepare the statement in different ways depending on whether or not
# the $var processing is compiled into the library.
#
ifcapable {tclvar} {
  do_test bind-2.1 {
    execsql {
      DELETE FROM t1;
    }
    set VM [sqlite3_prepare $DB {INSERT INTO t1 VALUES($one,$::two,$x(-z-))}\
            -1 TX]
    set TX
  } {}
  set v1 {$one}
  set v2 {$::two}
  set v3 {$x(-z-)}
}
ifcapable {!tclvar} {
  do_test bind-2.1 {
    execsql {
      DELETE FROM t1;
    }
    set VM [sqlite3_prepare $DB {INSERT INTO t1 VALUES(:one,:two,:_)} -1 TX]
    set TX
  } {}
  set v1 {:one}
  set v2 {:two}
  set v3 {:_}
}

do_test bind-2.1.1 {
  sqlite3_bind_parameter_count $VM
} 3
do_test bind-2.1.2 {
  sqlite3_bind_parameter_name $VM 1
} $v1
do_test bind-2.1.3 {
  sqlite3_bind_parameter_name $VM 2
} $v2
do_test bind-2.1.4 {
  sqlite3_bind_parameter_name $VM 3
} $v3
do_test bind-2.1.5 {
  sqlite3_bind_parameter_index $VM $v1
} 1
do_test bind-2.1.6 {
  sqlite3_bind_parameter_index $VM $v2
} 2
do_test bind-2.1.7 {
  sqlite3_bind_parameter_index $VM $v3
} 3
do_test bind-2.1.8 {
  sqlite3_bind_parameter_index $VM {:hi}
} 0

# 32 bit Integers
do_test bind-2.2 {
  sqlite3_bind_int $VM 1 123
  sqlite3_bind_int $VM 2 456
  sqlite3_bind_int $VM 3 789
  sqlite_step $VM N VALUES COLNAMES
  sqlite3_reset $VM
  execsql {SELECT rowid, * FROM t1}
} {1 123 456 789}
do_test bind-2.3 {
  sqlite3_bind_int $VM 2 -2000000000
  sqlite3_bind_int $VM 3 2000000000
  sqlite_step $VM N VALUES COLNAMES
  sqlite3_reset $VM
  execsql {SELECT rowid, * FROM t1}
} {1 123 456 789 2 123 -2000000000 2000000000}
do_test bind-2.4 {
  execsql {SELECT typeof(a), typeof(b), typeof(c) FROM t1}
} {integer integer integer integer integer integer}
do_test bind-2.5 {
  execsql {
    DELETE FROM t1;
  }
} {}

# 64 bit Integers
do_test bind-3.1 {
  sqlite3_bind_int64 $VM 1 32
  sqlite3_bind_int64 $VM 2 -2000000000000
  sqlite3_bind_int64 $VM 3 2000000000000
  sqlite_step $VM N VALUES COLNAMES
  sqlite3_reset $VM
  execsql {SELECT rowid, * FROM t1}
} {1 32 -2000000000000 2000000000000}
do_test bind-3.2 {
  execsql {SELECT typeof(a), typeof(b), typeof(c) FROM t1}
} {integer integer integer}
do_test bind-3.3 {
  execsql {
    DELETE FROM t1;
  }
} {}

# Doubles
do_test bind-4.1 {
  sqlite3_bind_double $VM 1 1234.1234
  sqlite3_bind_double $VM 2 0.00001
  sqlite3_bind_double $VM 3 123456789
  sqlite_step $VM N VALUES COLNAMES
  sqlite3_reset $VM
  set x [execsql {SELECT rowid, * FROM t1}]
  regsub {1e-005} $x {1e-05} y
  set y
} {1 1234.1234 1e-05 123456789.0}
do_test bind-4.2 {
  execsql {SELECT typeof(a), typeof(b), typeof(c) FROM t1}
} {real real real}
do_test bind-4.3 {
  execsql {
    DELETE FROM t1;
  }
} {}
do_test bind-4.4 {
  sqlite3_bind_double $VM 1 NaN
  sqlite3_bind_double $VM 2 1e300
  sqlite3_bind_double $VM 3 -1e-300
  sqlite_step $VM N VALUES COLNAMES
  sqlite3_reset $VM
  set x [execsql {SELECT rowid, * FROM t1}]
  regsub {1e-005} $x {1e-05} y
  set y
} {1 {} 1e+300 -1e-300}
do_test bind-4.5 {
  execsql {SELECT typeof(a), typeof(b), typeof(c) FROM t1}
} {null real real}
do_test bind-4.6 {
  execsql {
    DELETE FROM t1;
  }
} {}

# NULL
do_test bind-5.1 {
  sqlite3_bind_null $VM 1
  sqlite3_bind_null $VM 2
  sqlite3_bind_null $VM 3 
  sqlite_step $VM N VALUES COLNAMES
  sqlite3_reset $VM
  execsql {SELECT rowid, * FROM t1}
} {1 {} {} {}}
do_test bind-5.2 {
  execsql {SELECT typeof(a), typeof(b), typeof(c) FROM t1}
} {null null null}
do_test bind-5.3 {
  execsql {
    DELETE FROM t1;
  }
} {}

# UTF-8 text
do_test bind-6.1 {
  sqlite3_bind_text $VM 1 hellothere 5
  sqlite3_bind_text $VM 2 ".." 1
  sqlite3_bind_text $VM 3 world\000 -1
  sqlite_step $VM N VALUES COLNAMES
  sqlite3_reset $VM
  execsql {SELECT rowid, * FROM t1}
} {1 hello . world}
do_test bind-6.2 {
  execsql {SELECT typeof(a), typeof(b), typeof(c) FROM t1}
} {text text text}
do_test bind-6.3 {
  execsql {
    DELETE FROM t1;
  }
} {}

# Make sure zeros in a string work.
#
do_test bind-6.4 {
  db eval {DELETE FROM t1}
  sqlite3_bind_text $VM 1 hello\000there\000 12
  sqlite3_bind_text $VM 2 hello\000there\000 11
  sqlite3_bind_text $VM 3 hello\000there\000 -1
  sqlite_step $VM N VALUES COLNAMES
  sqlite3_reset $VM
  execsql {SELECT * FROM t1}
} {hello hello hello}
set enc [db eval {PRAGMA encoding}]
if {$enc=="UTF-8" || $enc==""} {
  do_test bind-6.5 {
    execsql {SELECT  hex(a), hex(b), hex(c) FROM t1}
  } {68656C6C6F00746865726500 68656C6C6F007468657265 68656C6C6F}
} elseif {$enc=="UTF-16le"} {
  do_test bind-6.5 {
    execsql {SELECT  hex(a), hex(b), hex(c) FROM t1}
  } {680065006C006C006F000000740068006500720065000000 680065006C006C006F00000074006800650072006500 680065006C006C006F00}
} elseif {$enc=="UTF-16be"} {
  do_test bind-6.5 {
    execsql {SELECT  hex(a), hex(b), hex(c) FROM t1}
  } {00680065006C006C006F0000007400680065007200650000 00680065006C006C006F000000740068006500720065 00680065006C006C006F}
} else {
  do_test bind-6.5 {
    set "Unknown database encoding: $::enc"
  } {}
}
do_test bind-6.6 {
  execsql {SELECT typeof(a), typeof(b), typeof(c) FROM t1}
} {text text text}
do_test bind-6.7 {
  execsql {
    DELETE FROM t1;
  }
} {}

# UTF-16 text
ifcapable {utf16} {
  do_test bind-7.1 {
    sqlite3_bind_text16 $VM 1 [encoding convertto unicode hellothere] 10
    sqlite3_bind_text16 $VM 2 [encoding convertto unicode ""] 0
    sqlite3_bind_text16 $VM 3 [encoding convertto unicode world] 10
    sqlite_step $VM N VALUES COLNAMES
    sqlite3_reset $VM
    execsql {SELECT rowid, * FROM t1}
  } {1 hello {} world}
  do_test bind-7.2 {
    execsql {SELECT typeof(a), typeof(b), typeof(c) FROM t1}
  } {text text text}
  do_test bind-7.3 {
    db eval {DELETE FROM t1}
    sqlite3_bind_text16 $VM 1 [encoding convertto unicode hi\000yall\000] 16
    sqlite3_bind_text16 $VM 2 [encoding convertto unicode hi\000yall\000] 14
    sqlite3_bind_text16 $VM 3 [encoding convertto unicode hi\000yall\000] -1
    sqlite_step $VM N VALUES COLNAMES
    sqlite3_reset $VM
    execsql {SELECT * FROM t1}
  } {hi hi hi}
  if {$enc=="UTF-8"} {
    do_test bind-7.4 {
      execsql {SELECT hex(a), hex(b), hex(c) FROM t1}
    } {68690079616C6C00 68690079616C6C 6869}
  } elseif {$enc=="UTF-16le"} {
    do_test bind-7.4 {
      execsql {SELECT hex(a), hex(b), hex(c) FROM t1}
    } {680069000000790061006C006C000000 680069000000790061006C006C00 68006900}
  } elseif {$enc=="UTF-16be"} {
    do_test bind-7.4 {
      execsql {SELECT hex(a), hex(b), hex(c) FROM t1}
    } {00680069000000790061006C006C0000 00680069000000790061006C006C 00680069}
  }
  do_test bind-7.5 {
    execsql {SELECT typeof(a), typeof(b), typeof(c) FROM t1}
  } {text text text}
}
do_test bind-7.99 {
  execsql {DELETE FROM t1;}
} {}

# Test that the 'out of range' error works.
do_test bind-8.1 {
  catch { sqlite3_bind_null $VM 0 }
} {1}
do_test bind-8.2 {
  sqlite3_errmsg $DB
} {column index out of range}
ifcapable {utf16} {
  do_test bind-8.3 {
    encoding convertfrom unicode [sqlite3_errmsg16 $DB]
  } {column index out of range}
}
do_test bind-8.4 {
  sqlite3_bind_null $VM 1 
  sqlite3_errmsg $DB
} {not an error}
do_test bind-8.5 {
  catch { sqlite3_bind_null $VM 4 }
} {1}
do_test bind-8.6 {
  sqlite3_errmsg $DB
} {column index out of range}
ifcapable {utf16} {
  do_test bind-8.7 {
    encoding convertfrom unicode [sqlite3_errmsg16 $DB]
  } {column index out of range}
}

do_test bind-8.8 {
  catch { sqlite3_bind_blob $VM 0 "abc" 3 }
} {1}
do_test bind-8.9 {
  catch { sqlite3_bind_blob $VM 4 "abc" 3 }
} {1}
do_test bind-8.10 {
  catch { sqlite3_bind_text $VM 0 "abc" 3 }
} {1}
ifcapable {utf16} {
  do_test bind-8.11 {
    catch { sqlite3_bind_text16 $VM 4 "abc" 2 }
  } {1}
}
do_test bind-8.12 {
  catch { sqlite3_bind_int $VM 0 5 }
} {1}
do_test bind-8.13 {
  catch { sqlite3_bind_int $VM 4 5 }
} {1}
do_test bind-8.14 {
  catch { sqlite3_bind_double $VM 0 5.0 }
} {1}
do_test bind-8.15 {
  catch { sqlite3_bind_double $VM 4 6.0 }
} {1}

do_test bind-8.99 {
  sqlite3_finalize $VM
} SQLITE_OK

set iMaxVar $SQLITE_MAX_VARIABLE_NUMBER
set zError "(1) variable number must be between ?1 and ?$iMaxVar"
do_test bind-9.1 {
  execsql {
    CREATE TABLE t2(a,b,c,d,e,f);
  }
  set rc [catch {
    sqlite3_prepare $DB {
      INSERT INTO t2(a) VALUES(?0)
    } -1 TAIL
  } msg]
  lappend rc $msg
} [list 1 $zError]
do_test bind-9.2 {
  set rc [catch {
    sqlite3_prepare $DB "INSERT INTO t2(a) VALUES(?[expr $iMaxVar+1])" -1 TAIL
  } msg]
  lappend rc $msg
} [list 1 $zError]
do_test bind-9.3.1 {
  set VM [
    sqlite3_prepare $DB "
      INSERT INTO t2(a,b) VALUES(?1,?$iMaxVar)
    " -1 TAIL
  ]
  sqlite3_bind_parameter_count $VM
} $iMaxVar
catch {sqlite3_finalize $VM}
do_test bind-9.3.2 {
  set VM [
    sqlite3_prepare $DB "
      INSERT INTO t2(a,b) VALUES(?2,?[expr $iMaxVar - 1])
    " -1 TAIL
  ]
  sqlite3_bind_parameter_count $VM
} [expr {$iMaxVar - 1}]
catch {sqlite3_finalize $VM}
do_test bind-9.4 {
  set VM [
    sqlite3_prepare $DB "
      INSERT INTO t2(a,b,c,d) VALUES(?1,?[expr $iMaxVar - 2],?,?)
    " -1 TAIL
  ]
  sqlite3_bind_parameter_count $VM
} $iMaxVar
do_test bind-9.5 {
  sqlite3_bind_int $VM 1 1
  sqlite3_bind_int $VM [expr $iMaxVar - 2] 999
  sqlite3_bind_int $VM [expr $iMaxVar - 1] 1000
  sqlite3_bind_int $VM $iMaxVar 1001
  sqlite3_step $VM
} SQLITE_DONE
do_test bind-9.6 {
  sqlite3_finalize $VM
} SQLITE_OK
do_test bind-9.7 {
  execsql {SELECT * FROM t2}
} {1 999 1000 1001 {} {}}

ifcapable {tclvar} {
  do_test bind-10.1 {
    set VM [
      sqlite3_prepare $DB {
        INSERT INTO t2(a,b,c,d,e,f) VALUES(:abc,$abc,:abc,$ab,$abc,:abc)
      } -1 TAIL
    ]
    sqlite3_bind_parameter_count $VM
  } 3
  set v1 {$abc}
  set v2 {$ab}
}
ifcapable {!tclvar} {
  do_test bind-10.1 {
    set VM [
      sqlite3_prepare $DB {
        INSERT INTO t2(a,b,c,d,e,f) VALUES(:abc,:xyz,:abc,:xy,:xyz,:abc)
      } -1 TAIL
    ]
    sqlite3_bind_parameter_count $VM
  } 3
  set v1 {:xyz}
  set v2 {:xy}
}
do_test bind-10.2 {
  sqlite3_bind_parameter_index $VM :abc
} 1
do_test bind-10.3 {
  sqlite3_bind_parameter_index $VM $v1
} 2
do_test bind-10.4 {
  sqlite3_bind_parameter_index $VM $v2
} 3
do_test bind-10.5 {
  sqlite3_bind_parameter_name $VM 1
} :abc
do_test bind-10.6 {
  sqlite3_bind_parameter_name $VM 2
} $v1
do_test bind-10.7 {
  sqlite3_bind_parameter_name $VM 3
} $v2
do_test bind-10.7.1 {
  sqlite3_bind_parameter_name 0 1   ;# Ignore if VM is NULL
} {}
do_test bind-10.7.2 {
  sqlite3_bind_parameter_name $VM 0 ;# Ignore if index too small
} {}
do_test bind-10.7.3 {
  sqlite3_bind_parameter_name $VM 4 ;# Ignore if index is too big
} {}
do_test bind-10.8 {
  sqlite3_bind_int $VM 1 1
  sqlite3_bind_int $VM 2 2
  sqlite3_bind_int $VM 3 3
  sqlite3_step $VM
} SQLITE_DONE
do_test bind-10.8.1 {
  # Binding attempts after program start should fail
  set rc [catch {
    sqlite3_bind_int $VM 1 1
  } msg]
  lappend rc $msg
} {1 {}}
do_test bind-10.9 {
  sqlite3_finalize $VM
} SQLITE_OK
do_test bind-10.10 {
  execsql {SELECT * FROM t2}
} {1 999 1000 1001 {} {} 1 2 1 3 2 1}

# Ticket #918
#
do_test bind-10.11 {
  # catch {sqlite3_finalize $VM}
  set VM [
    sqlite3_prepare $DB {
      INSERT INTO t2(a,b,c,d,e,f) VALUES(:abc,?,?4,:pqr,:abc,?4)
    } -1 TAIL
  ]
  sqlite3_bind_parameter_count $VM
} 5
do_test bind-10.11.1 {
  sqlite3_bind_parameter_index 0 :xyz  ;# ignore NULL VM arguments
} 0
do_test bind-10.12 {
  sqlite3_bind_parameter_index $VM :xyz
} 0
do_test bind-10.13 {
  sqlite3_bind_parameter_index $VM {}
} 0
do_test bind-10.14 {
  sqlite3_bind_parameter_index $VM :pqr
} 5
do_test bind-10.15 {
  sqlite3_bind_parameter_index $VM ?4
} 4
do_test bind-10.16 {
  sqlite3_bind_parameter_name $VM 1
} :abc
do_test bind-10.17 {
  sqlite3_bind_parameter_name $VM 2
} {}
do_test bind-10.18 {
  sqlite3_bind_parameter_name $VM 3
} {}
do_test bind-10.19 {
  sqlite3_bind_parameter_name $VM 4
} {?4}
do_test bind-10.20 {
  sqlite3_bind_parameter_name $VM 5
} :pqr
catch {sqlite3_finalize $VM}

# Make sure we catch an unterminated "(" in a Tcl-style variable name
#
ifcapable tclvar {
  do_test bind-11.1 {
    catchsql {SELECT * FROM sqlite_master WHERE name=$abc(123 and sql NOT NULL;}
  } {1 {unrecognized token: "$abc(123"}}
}

if {[execsql {pragma encoding}]=="UTF-8"} {
  # Test the ability to bind text that contains embedded '\000' characters.
  # Make sure we can recover the entire input string.
  #
  do_test bind-12.1 {
    execsql {
      CREATE TABLE t3(x BLOB);
    }
    set VM [sqlite3_prepare $DB {INSERT INTO t3 VALUES(?)} -1 TAIL]
    sqlite_bind  $VM 1 not-used blob10
    sqlite3_step $VM
    sqlite3_finalize $VM
    execsql {
      SELECT typeof(x), length(x), quote(x),
             length(cast(x AS BLOB)), quote(cast(x AS BLOB)) FROM t3
    }
  } {text 3 'abc' 10 X'6162630078797A007071'}
  do_test bind-12.2 {
    sqlite3_create_function $DB
    execsql {
      SELECT quote(cast(x_coalesce(x) AS blob)) FROM t3
    }
  } {X'6162630078797A007071'}
}

# Test the operation of sqlite3_clear_bindings
#
do_test bind-13.1 {
  set VM [sqlite3_prepare $DB {SELECT ?,?,?} -1 TAIL]
  sqlite3_step $VM
  list [sqlite3_column_type $VM 0] [sqlite3_column_type $VM 1] \
               [sqlite3_column_type $VM 2]
} {NULL NULL NULL}
do_test bind-13.2 {
  sqlite3_reset $VM
  sqlite3_bind_int $VM 1 1
  sqlite3_bind_int $VM 2 2
  sqlite3_bind_int $VM 3 3
  sqlite3_step $VM
  list [sqlite3_column_type $VM 0] [sqlite3_column_type $VM 1] \
               [sqlite3_column_type $VM 2]
} {INTEGER INTEGER INTEGER}
do_test bind-13.3 {
  sqlite3_reset $VM
  sqlite3_step $VM
  list [sqlite3_column_type $VM 0] [sqlite3_column_type $VM 1] \
               [sqlite3_column_type $VM 2]
} {INTEGER INTEGER INTEGER}
do_test bind-13.4 {
  sqlite3_reset $VM
  sqlite3_clear_bindings $VM
  sqlite3_step $VM
  list [sqlite3_column_type $VM 0] [sqlite3_column_type $VM 1] \
               [sqlite3_column_type $VM 2]
} {NULL NULL NULL}
sqlite3_finalize $VM

#--------------------------------------------------------------------
# These tests attempt to reproduce bug #3463.
#
proc param_names {db zSql} {
  set ret [list]
  set VM [sqlite3_prepare db $zSql -1 TAIL]
  for {set ii 1} {$ii <= [sqlite3_bind_parameter_count $VM]} {incr ii} {
    lappend ret [sqlite3_bind_parameter_name $VM $ii]
  }
  sqlite3_finalize $VM
  set ret
}

do_test bind-14.1 {
  param_names db { SELECT @a, @b }
} {@a @b}
do_test bind-14.2 {
  param_names db { SELECT NULL FROM (SELECT NULL) WHERE @a = @b }
} {@a @b}
do_test bind-14.3 {
  param_names db { SELECT @a FROM (SELECT NULL) WHERE 1 = @b }
} {@a @b}
do_test bind-14.4 {
  param_names db { SELECT @a, @b FROM (SELECT NULL) }
} {@a @b}

#--------------------------------------------------------------------------
# Tests of the OP_Variable opcode where P3>1
#
do_test bind-15.1 {
  db eval {CREATE TABLE t4(a,b,c,d,e,f,g,h);}
  set VM [sqlite3_prepare db {
       INSERT INTO t4(a,b,c,d,f,g,h,e) VALUES(?,?,?,?,?,?,?,?)
  } -1 TAIL]
  sqlite3_bind_int $VM 1 1
  sqlite3_bind_int $VM 2 2
  sqlite3_bind_int $VM 3 3
  sqlite3_bind_int $VM 4 4
  sqlite3_bind_int $VM 5 5
  sqlite3_bind_int $VM 6 6
  sqlite3_bind_int $VM 7 7
  sqlite3_bind_int $VM 8 8
  sqlite3_step $VM
  sqlite3_finalize $VM
  db eval {SELECT * FROM t4}
} {1 2 3 4 8 5 6 7}
do_test bind-15.2 {
  db eval {DELETE FROM t4}
  set VM [sqlite3_prepare db {
       INSERT INTO t4(a,b,c,d,e,f,g,h) VALUES(?,?,?,?,?,?,?,?)
  } -1 TAIL]
  sqlite3_bind_int $VM 1 1
  sqlite3_bind_int $VM 2 2
  sqlite3_bind_int $VM 3 3
  sqlite3_bind_int $VM 4 4
  sqlite3_bind_int $VM 5 5
  sqlite3_bind_int $VM 6 6
  sqlite3_bind_int $VM 7 7
  sqlite3_bind_int $VM 8 8
  sqlite3_step $VM
  sqlite3_finalize $VM
  db eval {SELECT * FROM t4}
} {1 2 3 4 5 6 7 8}
do_test bind-15.3 {
  db eval {DELETE FROM t4}
  set VM [sqlite3_prepare db {
       INSERT INTO t4(h,g,f,e,d,c,b,a) VALUES(?,?,?,?,?,?,?,?)
  } -1 TAIL]
  sqlite3_bind_int $VM 1 1
  sqlite3_bind_int $VM 2 2
  sqlite3_bind_int $VM 3 3
  sqlite3_bind_int $VM 4 4
  sqlite3_bind_int $VM 5 5
  sqlite3_bind_int $VM 6 6
  sqlite3_bind_int $VM 7 7
  sqlite3_bind_int $VM 8 8
  sqlite3_step $VM
  sqlite3_finalize $VM
  db eval {SELECT * FROM t4}
} {8 7 6 5 4 3 2 1}
do_test bind-15.4 {
  db eval {DELETE FROM t4}
  set VM [sqlite3_prepare db {
       INSERT INTO t4(a,b,c,d,e,f,g,h) VALUES(?,?,?,?4,?,?6,?,?)
  } -1 TAIL]
  sqlite3_bind_int $VM 1 1
  sqlite3_bind_int $VM 2 2
  sqlite3_bind_int $VM 3 3
  sqlite3_bind_int $VM 4 4
  sqlite3_bind_int $VM 5 5
  sqlite3_bind_int $VM 6 6
  sqlite3_bind_int $VM 7 7
  sqlite3_bind_int $VM 8 8
  sqlite3_step $VM
  sqlite3_finalize $VM
  db eval {SELECT * FROM t4}
} {1 2 3 4 5 6 7 8}

finish_test
