import { zip, type Zippable } from "fflate";
import type { Bytes } from "../documents/types";

export function buildZip(files: { path: string; data: Uint8Array }[]): Promise<Bytes> {
  const input: Zippable = {};
  for (const file of files) {
    input[file.path] = file.data;
  }
  return new Promise((resolve, reject) => {
    zip(input, { level: 6 }, (error, out) => {
      // fflate's declarations predate typed-array generics; the output is a
      // freshly allocated, ArrayBuffer-backed Uint8Array.
      if (error) reject(error);
      else resolve(out as Bytes);
    });
  });
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
