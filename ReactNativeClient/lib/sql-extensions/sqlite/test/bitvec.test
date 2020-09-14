# 2008 February 18
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
# Unit testing of the Bitvec object.
#
# $Id: bitvec.test,v 1.4 2009/04/01 23:49:04 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# The built-in test logic must be operational in order for
# this test to work.
ifcapable !builtin_test {
  finish_test
  return
}

# Test that sqlite3BitvecBuiltinTest correctly reports errors
# that are deliberately introduced.
#
do_test bitvec-1.0.1 {
  sqlite3BitvecBuiltinTest 400 {5 1 1 1 0}
} 1
do_test bitvec-1.0.2 {
  sqlite3BitvecBuiltinTest 400 {5 1 234 1 0}
} 234

# Run test cases that set every bit in vectors of various sizes.
# for larger cases, this should cycle the bit vector representation
# from hashing into subbitmaps.  The subbitmaps should start as
# hashes then change to either subbitmaps or linear maps, depending
# on their size.
#
do_test bitvec-1.1 {
  sqlite3BitvecBuiltinTest 400 {1 400 1 1 0}
} 0
do_test bitvec-1.2 {
  sqlite3BitvecBuiltinTest 4000 {1 4000 1 1 0}
} 0
do_test bitvec-1.3 {
  sqlite3BitvecBuiltinTest 40000 {1 40000 1 1 0}
} 0
do_test bitvec-1.4 {
  sqlite3BitvecBuiltinTest 400000 {1 400000 1 1 0}
} 0

# By specifying a larger increments, we spread the load around.
#
do_test bitvec-1.5 {
  sqlite3BitvecBuiltinTest 400 {1 400 1 7 0}
} 0
do_test bitvec-1.6 {
  sqlite3BitvecBuiltinTest 4000 {1 4000 1 7 0}
} 0
do_test bitvec-1.7 {
  sqlite3BitvecBuiltinTest 40000 {1 40000 1 7 0}
} 0
do_test bitvec-1.8 {
  sqlite3BitvecBuiltinTest 400000 {1 400000 1 7 0}
} 0

# First fill up the bitmap with ones,  then go through and
# clear all the bits.  This will stress the clearing mechanism.
#
do_test bitvec-1.9 {
  sqlite3BitvecBuiltinTest 400 {1 400 1 1 2 400 1 1 0}
} 0
do_test bitvec-1.10 {
  sqlite3BitvecBuiltinTest 4000 {1 4000 1 1 2 4000 1 1 0}
} 0
do_test bitvec-1.11 {
  sqlite3BitvecBuiltinTest 40000 {1 40000 1 1 2 40000 1 1 0}
} 0
do_test bitvec-1.12 {
  sqlite3BitvecBuiltinTest 400000 {1 400000 1 1 2 400000 1 1 0}
} 0

do_test bitvec-1.13 {
  sqlite3BitvecBuiltinTest 400 {1 400 1 1 2 400 1 7 0}
} 0
do_test bitvec-1.15 {
  sqlite3BitvecBuiltinTest 4000 {1 4000 1 1 2 4000 1 7 0}
} 0
do_test bitvec-1.16 {
  sqlite3BitvecBuiltinTest 40000 {1 40000 1 1 2 40000 1 77 0}
} 0
do_test bitvec-1.17 {
  sqlite3BitvecBuiltinTest 400000 {1 400000 1 1 2 400000 1 777 0}
} 0

do_test bitvec-1.18 {
  sqlite3BitvecBuiltinTest 400000 {1 5000 100000 1 2 400000 1 37 0}
} 0

# Attempt to induce hash collisions.  
#
unset -nocomplain start
unset -nocomplain incr
foreach start {1 2 3 4 5 6 7 8} {
  foreach incr {124 125} {
    do_test bitvec-1.20.$start.$incr {
      set prog [list 1 60 $::start $::incr 2 5000 1 1 0]
      sqlite3BitvecBuiltinTest 5000 $prog
    } 0
  }
}

do_test bitvec-1.30.big_and_slow {
  sqlite3BitvecBuiltinTest 17000000 {1 17000000 1 1 2 17000000 1 1 0}
} 0


# Test setting and clearing a random subset of bits.
#
do_test bitvec-2.1 {
  sqlite3BitvecBuiltinTest 4000 {3 2000 4 2000 0}
} 0
do_test bitvec-2.2 {
  sqlite3BitvecBuiltinTest 4000 {3 1000 4 1000 3 1000 4 1000 3 1000 4 1000
                                 3 1000 4 1000 3 1000 4 1000 3 1000 4 1000 0}
} 0
do_test bitvec-2.3 {
  sqlite3BitvecBuiltinTest 400000 {3 10 0}
} 0
do_test bitvec-2.4 {
  sqlite3BitvecBuiltinTest 4000 {3 10 2 4000 1 1 0}
} 0
do_test bitvec-2.5 {
  sqlite3BitvecBuiltinTest 5000 {3 20 2 5000 1 1 0}
} 0
do_test bitvec-2.6 {
  sqlite3BitvecBuiltinTest 50000 {3 60 2 50000 1 1 0}
} 0
do_test bitvec-2.7 {
  sqlite3BitvecBuiltinTest 5000 {
          1 25 121 125
          1 50 121 125
          2 25 121 125
          0
  }
} 0

# This procedure runs sqlite3BitvecBuiltinTest with argments "n" and
# "program".  But it also causes a malloc error to occur after the
# "failcnt"-th malloc.  The result should be "0" if no malloc failure
# occurs or "-1" if there is a malloc failure.
#
proc bitvec_malloc_test {label failcnt n program} {
  do_test $label [subst {
    sqlite3_memdebug_fail $failcnt
    set x \[sqlite3BitvecBuiltinTest $n [list $program]\]
    set nFail \[sqlite3_memdebug_fail -1\]
    if {\$nFail==0} {
      set ::go 0
      set x -1
    }
    set x
  }] -1
}

# Make sure malloc failures are handled sanily.
#
unset -nocomplain n
unset -nocomplain go
set go 1
save_prng_state
for {set n 0} {$go} {incr n} {
  restore_prng_state
  bitvec_malloc_test bitvec-3.1.$n $n 5000 {
      3 60 2 5000 1 1 3 60 2 5000 1 1 3 60 2 5000 1 1 0
  }
}
set go 1
for {set n 0} {$go} {incr n} {
  restore_prng_state
  bitvec_malloc_test bitvec-3.2.$n $n 5000 {
      3 600 2 5000 1 1 3 600 2 5000 1 1 3 600 2 5000 1 1 0
  }
}
set go 1
for {set n 1} {$go} {incr n} {
  bitvec_malloc_test bitvec-3.3.$n $n 50000 {1 50000 1 1 0}
}

finish_test
return
