// Image sizes rarely change for a URL, so remember them for the life of the server. Only sizes actually read are
// remembered: a link that isn't an image yet (e.g. not deployed) is tried again next time.
const sizeCache = new Map<string, { width: number; height: number }>();

// Enough of the file for every format below (JPEG's size can sit after its metadata, so allow a generous header)
const HEADER_BYTES = 64 * 1024;

/**
 * Reads an image's pixel size from the start of its file (PNG, GIF, WebP, JPEG). Returns null for anything else
 * (e.g. SVG) or bytes it can't make sense of.
 */
export const readImageSize = (bytes: Uint8Array): { width: number; height: number } | null => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length));

  // PNG: width/height in the IHDR chunk
  if (bytes.length >= 24 && bytes[0] === 0x89 && ascii(1, 3) === "PNG") {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  // GIF: little-endian width/height after the signature
  if (bytes.length >= 10 && ascii(0, 3) === "GIF") {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }

  // WebP: lossy (VP8), lossless (VP8L), or extended (VP8X)
  if (bytes.length >= 30 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    const chunk = ascii(12, 4);
    if (chunk === "VP8 ")
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") {
      const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      return { width, height };
    }
    return null;
  }

  // JPEG: walk the segments to the start-of-frame, which holds the size
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1];
      const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isStartOfFrame) return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) };
      offset += 2 + view.getUint16(offset + 2);
    }
  }

  return null;
};

/**
 * Fetches just the start of an image and returns its pixel size, or null if it can't be read (bad URL, SVG, …).
 * Never throws.
 */
export const getImageSize = async (url: string) => {
  if (!url) return null;
  if (sizeCache.has(url)) return sizeCache.get(url)!;

  try {
    const response = await fetch(url, { headers: { Range: `bytes=0-${HEADER_BYTES - 1}` } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const size = readImageSize(new Uint8Array(await response.arrayBuffer()).subarray(0, HEADER_BYTES));
    if (!size) throw new Error(`not a PNG/JPEG/GIF/WebP (content-type ${response.headers.get("content-type")})`);
    sizeCache.set(url, size);
    return size;
  } catch (error: any) {
    console.warn(`[getImageSize] Couldn't read the size of ${url}: ${error?.message || error}`);
    return null;
  }
};
