#!/usr/bin/env bash

sz_program=${SZA_PATH:-7za}
sz_type=${SZA_ARCHIVE_TYPE:-xz}

case $1 in
  -d) "$sz_program" e -si -so -t${sz_type} ;;
   *) "$sz_program" a f -si -so -t${sz_type} -mx${SZA_COMPRESSION_LEVEL:-9} ;;
esac 2> /dev/null