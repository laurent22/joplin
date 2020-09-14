#!/bin/sh
# restart with tclsh \
exec tclsh "$0" "$@"

set srcdir [file dirname [file dirname [info script]]]
set G(src) [string map [list %dir% $srcdir] {
  %dir%/lsm.h
  %dir%/lsmInt.h
  %dir%/lsm_vtab.c
  %dir%/lsm_ckpt.c
  %dir%/lsm_file.c
  %dir%/lsm_log.c
  %dir%/lsm_main.c
  %dir%/lsm_mem.c
  %dir%/lsm_mutex.c
  %dir%/lsm_shared.c
  %dir%/lsm_sorted.c
  %dir%/lsm_str.c
  %dir%/lsm_tree.c
  %dir%/lsm_unix.c
  %dir%/lsm_varint.c
  %dir%/lsm_win32.c
}]

set G(hdr) {

#if !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_LSM1) 

#if !defined(NDEBUG) && !defined(SQLITE_DEBUG) 
# define NDEBUG 1
#endif
#if defined(NDEBUG) && defined(SQLITE_DEBUG)
# undef NDEBUG
#endif

}

set G(footer) {
    
#endif /* !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_LSM1) */
}

#-------------------------------------------------------------------------
# Read and return the entire contents of text file $zFile from disk.
#
proc readfile {zFile} {
  set fd [open $zFile]
  set data [read $fd]
  close $fd
  return $data
}

proc lsm1c_init {zOut} {
  global G
  set G(fd) stdout
  set G(fd) [open $zOut w]

  puts -nonewline $G(fd) $G(hdr)
}

proc lsm1c_printfile {zIn} {
  global G
  set data [readfile $zIn]
  set zTail [file tail $zIn]
  puts $G(fd) "#line 1 \"$zTail\""

  foreach line [split $data "\n"] {
    if {[regexp {^# *include.*lsm} $line]} {
      set line "/* $line */"
    } elseif { [regexp {^(const )?[a-zA-Z][a-zA-Z0-9]* [*]?lsm[^_]} $line] } {
      set line "static $line"
    }
    puts $G(fd) $line
  }
}

proc lsm1c_close {} {
  global G
  puts -nonewline $G(fd) $G(footer)
  if {$G(fd)!="stdout"} {
    close $G(fd)
  }
}


lsm1c_init lsm1.c
foreach f $G(src) { lsm1c_printfile $f }
lsm1c_close
