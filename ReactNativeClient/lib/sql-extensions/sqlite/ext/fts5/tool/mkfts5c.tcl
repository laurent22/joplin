#!/bin/sh
# restart with tclsh \
exec tclsh "$0" "$@"

set srcdir [file dirname [file dirname [info script]]]
set G(src) [string map [list %dir% $srcdir] {
  %dir%/fts5.h
  %dir%/fts5Int.h
  fts5parse.h
  fts5parse.c
  %dir%/fts5_aux.c
  %dir%/fts5_buffer.c
  %dir%/fts5_config.c
  %dir%/fts5_expr.c
  %dir%/fts5_hash.c
  %dir%/fts5_index.c
  %dir%/fts5_main.c
  %dir%/fts5_storage.c
  %dir%/fts5_tokenize.c
  %dir%/fts5_unicode2.c
  %dir%/fts5_varint.c
  %dir%/fts5_vocab.c
}]

set G(hdr) {

#if !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_FTS5) 

#if !defined(NDEBUG) && !defined(SQLITE_DEBUG) 
# define NDEBUG 1
#endif
#if defined(NDEBUG) && defined(SQLITE_DEBUG)
# undef NDEBUG
#endif

}

set G(footer) {
    
#endif /* !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_FTS5) */
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

#-------------------------------------------------------------------------
# This command returns a string identifying the current sqlite version -
# the equivalent of the SQLITE_SOURCE_ID string.
#
proc fts5_source_id {zDir} {
  set top [file dirname [file dirname $zDir]]
  set uuid [string trim [readfile [file join $top manifest.uuid]]]

  set L [split [readfile [file join $top manifest]]] 
  set date [lindex $L [expr [lsearch -exact $L D]+1]]
  set date [string range $date 0 [string last . $date]-1]
  set date [string map {T { }} $date]

  return "fts5: $date $uuid"
}

proc fts5c_init {zOut} {
  global G
  set G(fd) stdout
  set G(fd) [open $zOut w]

  puts -nonewline $G(fd) $G(hdr)
}

proc fts5c_printfile {zIn} {
  global G
  set data [readfile $zIn]
  set zTail [file tail $zIn]
  puts $G(fd) "#line 1 \"$zTail\""

  set sub_map [list --FTS5-SOURCE-ID-- [fts5_source_id $::srcdir]]
  if {$zTail=="fts5parse.c"} {
    lappend sub_map yy fts5yy YY fts5YY TOKEN FTS5TOKEN
  }

  foreach line [split $data "\n"] {
    if {[regexp {^#include.*fts5} $line]} {
      set line "/* $line */"
    } elseif { 
         ![regexp { sqlite3Fts5Init\(} $line] 
       && [regexp {^(const )?[a-zA-Z][a-zA-Z0-9]* [*]?sqlite3Fts5} $line]
    } {
      set line "static $line"
    }
    set line [string map $sub_map $line]
    puts $G(fd) $line
  }
}

proc fts5c_close {} {
  global G
  puts -nonewline $G(fd) $G(footer)
  if {$G(fd)!="stdout"} {
    close $G(fd)
  }
}


fts5c_init fts5.c
foreach f $G(src) { fts5c_printfile $f }
fts5c_close
