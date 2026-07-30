/* Relocation-safe import.meta.url for statically embedded package modules.
 *
 * This is a link-gated leaf rather than part of scr_lib.c: programs with no
 * moduleUrl IR never compile it, and programs that do use it pull neither the
 * node:path implementation nor the WHATWG URL object/parser closure. The input
 * is already validator-proven `<package>/<package-relative-path>` with `/`
 * separators, so construction needs only the running executable's directory
 * plus pathToFileURL's byte-level file-path encoding set. */
#include "scr_runtime.h"

#include <stdlib.h>
#include <string.h>

static bool scr_module_url_encode(unsigned char c) {
  return c < 0x20 || c == 0x7f || c >= 0x80 || c == ' ' || c == '"' ||
         c == '#' || c == '%' || c == '<' || c == '>' || c == '?' ||
         c == '[' || c == '\\' || c == ']' || c == '^' || c == '`' ||
         c == '{' || c == '|' || c == '}';
}

ScrStr *scr_module_url(ScrStr *identity) {
  static const char prefix[] = "file://";
  static const char modules[] = "/.scriptc-modules/";
  static const char hex[] = "0123456789ABCDEF";
  ScrStr *exec_path = scr_process_exec_path();
  size_t dir_len = exec_path->len;
#ifdef _WIN32
  while (dir_len > 0 && exec_path->data[dir_len - 1] != '/' &&
         exec_path->data[dir_len - 1] != '\\') {
    dir_len--;
  }
  if (dir_len > 0) dir_len--;
  size_t drive_slash = dir_len >= 2 && exec_path->data[1] == ':' ? 1 : 0;
#else
  while (dir_len > 1 && exec_path->data[dir_len - 1] != '/') dir_len--;
  if (dir_len > 1) dir_len--;
  else if (dir_len == 1 && exec_path->data[0] == '/') dir_len = 0;
  size_t drive_slash = 0;
#endif
  size_t raw_len = drive_slash + dir_len + sizeof(modules) - 1 + identity->len;
  if (raw_len > (SIZE_MAX - (sizeof(prefix) - 1)) / 3) {
    scr_str_release(exec_path);
    scr_trap("scriptc: out of memory\n");
  }
  ScrStr *out = scr_str_alloc_raw(0, sizeof(prefix) - 1 + raw_len * 3);
  memcpy(out->data, prefix, sizeof(prefix) - 1);
  out->len = sizeof(prefix) - 1;
  if (drive_slash != 0) out->data[out->len++] = '/';

  for (size_t part = 0; part < 3; part++) {
    const char *data = part == 0 ? exec_path->data
                      : part == 1 ? modules
                                  : identity->data;
    size_t len = part == 0 ? dir_len
                 : part == 1 ? sizeof(modules) - 1
                             : identity->len;
    for (size_t i = 0; i < len; i++) {
      unsigned char c = (unsigned char)data[i];
#ifdef _WIN32
      if (c == '\\') c = '/';
#endif
      if (scr_module_url_encode(c)) {
        out->data[out->len++] = '%';
        out->data[out->len++] = hex[c >> 4];
        out->data[out->len++] = hex[c & 15];
      } else {
        out->data[out->len++] = (char)c;
      }
    }
  }
  out->data[out->len] = '\0';
  scr_str_release(exec_path);
  return out;
}
