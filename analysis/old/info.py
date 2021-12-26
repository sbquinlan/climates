import click
import struct

def is_lilendian(buffer):
  fchar, schar = struct.unpack('=cc', buffer[:2])
  return fchar == schar and schar == b'I'

def w_endian(format: str, buffer, lilendian: bool):
  return struct.unpack(('<' if lilendian else '>') + format, buffer)

def header_info(buffer): 
  lilendian = is_lilendian(buffer)
  # assert it's a tiff file
  assert(42 == w_endian('h', buffer[2:4], lilendian)[0])
  ifd_offset = w_endian('I', buffer[4:8], lilendian)[0]
  print(
    f"Endianness: {'little' if lilendian else 'big'}\nFirst IFD Offset: {ifd_offset}"
  )
  return (lilendian, ifd_offset)

def ifd_entry_info(buffer, entry_start, lilendian):
  (tag, tag_type, tag_count, tag_value_or_offset) = w_endian(
    'hhII', buffer[entry_start:entry_start+12], lilendian
  )
  print(f'{tag} {tag_type} {tag_count} {tag_value_or_offset}')

def ifd_info(buffer, ifd_offset, lilendian):
  end_of_count = ifd_offset + 2
  num_entries = w_endian('h', buffer[ifd_offset:end_of_count], lilendian)[0]
  print(f"\n[IFD ({num_entries} entries)]")
  # start at the end of the entry count
  # go 12 * num of entries, increment 12 bytes each time
  for entry_start in range(end_of_count, end_of_count + (12 * num_entries), 12):
    ifd_entry_info(buffer, entry_start, lilendian)

@click.command()
@click.argument('path')
def info(path: str):
  with open(path, 'rb') as file:
    buffer = file.read()
    (lilendian, ifd_offset) = header_info(buffer)
    ifd_info(buffer, ifd_offset, lilendian)

if __name__ == '__main__':
  info()