// QR code encoder (ECC level L, auto version 1-40, auto mask) -> Unicode half-block string.
// Port of the C implementation. Runs on Bun (also Node 18+ with a TS runner).

const MAX_SIZE = 177;
const QUIET = 4;

const ECC_PER_BLOCK = [
  -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28,
  28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  30, 30,
];
const NUM_BLOCKS = [
  -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10,
  12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25,
];

const ALNUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

const enum Mode {
  Numeric = 1,
  Alnum = 2,
  Byte = 4,
}

// ---------- Bit buffer ----------

class Bits {
  data = new Uint8Array(3100);
  len = 0;

  put(v: number, n: number): void {
    for (let i = n - 1; i >= 0; i--) {
      const idx = this.len >> 3;
      const cur = (this.len & 7) === 0 ? 0 : this.data[idx]!;
      this.data[idx] = cur | (((v >>> i) & 1) << (7 - (this.len & 7)));
      this.len++;
    }
  }
}

// ---------- Reed-Solomon over GF(256) ----------

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >> 7) * 0x11d);
    z ^= ((y >> i) & 1) * x;
  }
  return z & 0xff;
}

function rsGenerator(deg: number): Uint8Array {
  const g = new Uint8Array(deg);
  g[deg - 1] = 1;
  let root = 1;
  for (let i = 0; i < deg; i++) {
    for (let j = 0; j < deg; j++) {
      let v = gfMul(g[j]!, root);
      if (j + 1 < deg) v ^= g[j + 1]!;
      g[j] = v;
    }
    root = gfMul(root, 2);
  }
  return g;
}

function rsRemainder(data: Uint8Array, g: Uint8Array, deg: number): Uint8Array {
  const res = new Uint8Array(deg);
  for (let i = 0; i < data.length; i++) {
    const f = data[i]! ^ res[0]!;
    res.copyWithin(0, 1);
    res[deg - 1] = 0;
    for (let j = 0; j < deg; j++) res[j] = res[j]! ^ gfMul(g[j]!, f);
  }
  return res;
}

// ---------- Geometry helpers ----------

function rawModules(v: number): number {
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) {
    const na = Math.floor(v / 7) + 2;
    r -= (25 * na - 10) * na - 55;
    if (v >= 7) r -= 36;
  }
  return r;
}

function alignPositions(v: number): number[] {
  if (v === 1) return [];
  const na = Math.floor(v / 7) + 2;
  const size = v * 4 + 17;
  const step =
    v === 32 ? 26 : Math.floor((v * 4 + na * 2 + 1) / (na * 2 - 2)) * 2;
  const p = new Array<number>(na);
  p[0] = 6;
  for (let i = na - 1, pos = size - 7; i >= 1; i--, pos -= step) p[i] = pos;
  return p;
}

// ---------- QR matrix ----------

class QR {
  readonly size: number;
  readonly mod = new Uint8Array(MAX_SIZE * MAX_SIZE);
  readonly fn = new Uint8Array(MAX_SIZE * MAX_SIZE);

  constructor(readonly version: number) {
    this.size = version * 4 + 17;
  }

  get(x: number, y: number): number {
    return this.mod[y * MAX_SIZE + x]!;
  }

  private setFn(x: number, y: number, dark: number): void {
    this.mod[y * MAX_SIZE + x] = dark;
    this.fn[y * MAX_SIZE + x] = 1;
  }

  private drawFinder(cx: number, cy: number): void {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= this.size || y >= this.size) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        this.setFn(x, y, dist !== 2 && dist !== 4 ? 1 : 0);
      }
  }

  private drawAlign(cx: number, cy: number): void {
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        this.setFn(cx + dx, cy + dy, dist !== 1 ? 1 : 0);
      }
  }

  drawFormat(mask: number): void {
    const n = this.size;
    const data = (1 << 3) | mask; // ECC level L
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const bit = (i: number) => (bits >> i) & 1;

    for (let i = 0; i <= 5; i++) this.setFn(8, i, bit(i));
    this.setFn(8, 7, bit(6));
    this.setFn(8, 8, bit(7));
    this.setFn(7, 8, bit(8));
    for (let i = 9; i < 15; i++) this.setFn(14 - i, 8, bit(i));

    for (let i = 0; i < 8; i++) this.setFn(n - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) this.setFn(8, n - 15 + i, bit(i));
    this.setFn(8, n - 8, 1); // always-dark module
  }

  private drawVersion(): void {
    const ver = this.version;
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
    const bits = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = (bits >> i) & 1;
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFn(a, b, bit);
      this.setFn(b, a, bit);
    }
  }

  drawFunctionPatterns(): void {
    const n = this.size;
    for (let i = 0; i < n; i++) {
      this.setFn(6, i, i % 2 === 0 ? 1 : 0);
      this.setFn(i, 6, i % 2 === 0 ? 1 : 0);
    }
    this.drawFinder(3, 3);
    this.drawFinder(n - 4, 3);
    this.drawFinder(3, n - 4);

    const p = alignPositions(this.version);
    const na = p.length;
    for (let i = 0; i < na; i++)
      for (let j = 0; j < na; j++) {
        if (
          (i === 0 && j === 0) ||
          (i === 0 && j === na - 1) ||
          (i === na - 1 && j === 0)
        )
          continue;
        this.drawAlign(p[i]!, p[j]!);
      }

    this.drawFormat(0);
    if (this.version >= 7) this.drawVersion();
  }

  drawCodewords(cw: Uint8Array): void {
    const n = this.size;
    const total = cw.length * 8;
    let i = 0;
    for (let right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < n; vert++)
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const up = ((right + 1) & 2) === 0;
          const y = up ? n - 1 - vert : vert;
          if (!this.fn[y * MAX_SIZE + x] && i < total) {
            this.mod[y * MAX_SIZE + x] = (cw[i >> 3]! >> (7 - (i & 7))) & 1;
            i++;
          }
        }
    }
  }

  applyMask(m: number): void {
    for (let y = 0; y < this.size; y++)
      for (let x = 0; x < this.size; x++)
        if (!this.fn[y * MAX_SIZE + x] && maskHit(m, x, y)) {
          const k = y * MAX_SIZE + x;
          this.mod[k] = this.mod[k]! ^ 1;
        }
  }

  penalty(): number {
    const n = this.size;
    let score = 0;

    for (let dir = 0; dir < 2; dir++)
      for (let a = 0; a < n; a++) {
        let run = 0;
        let last = -1;
        let w = 0;
        for (let b = 0; b < n; b++) {
          const c = dir ? this.get(a, b) : this.get(b, a);
          if (c === last) {
            run++;
            if (run === 5) score += 3;
            else if (run > 5) score += 1;
          } else {
            run = 1;
            last = c;
          }
          w = ((w << 1) | c) & 0x7ff;
          if (b >= 10 && (w === 0x5d0 || w === 0x05d)) score += 40;
        }
      }

    let dark = 0;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const c = this.get(x, y);
        dark += c;
        if (x < n - 1 && y < n - 1) {
          if (
            c === this.get(x + 1, y) &&
            c === this.get(x, y + 1) &&
            c === this.get(x + 1, y + 1)
          )
            score += 3;
        }
      }

    const total = n * n;
    const k =
      Math.floor((Math.abs(dark * 20 - total * 10) + total - 1) / total) - 1;
    score += k * 10;
    return score;
  }

  render(): string {
    const n = this.size;
    const lines: string[] = [];
    for (let y = -QUIET; y < n + QUIET; y += 2) {
      let line = "";
      for (let x = -QUIET; x < n + QUIET; x++) {
        const inX = x >= 0 && x < n;
        const top = inX && y >= 0 && y < n && this.get(x, y) === 1;
        const bot = inX && y + 1 >= 0 && y + 1 < n && this.get(x, y + 1) === 1;
        line += top && bot ? "█" : top ? "▀" : bot ? "▄" : " ";
      }
      lines.push(line);
    }
    return lines.join("\n") + "\n";
  }
}

function maskHit(m: number, x: number, y: number): boolean {
  switch (m) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

// ---------- Encoding ----------

function ccBits(mode: Mode, ver: number): number {
  const i = ver <= 9 ? 0 : ver <= 26 ? 1 : 2;
  const num = [10, 12, 14];
  const aln = [9, 11, 13];
  const byt = [8, 16, 16];
  return (
    mode === Mode.Numeric ? num[i] : mode === Mode.Alnum ? aln[i] : byt[i]
  )!;
}

function dataBits(mode: Mode, n: number): number {
  if (mode === Mode.Numeric)
    return 10 * Math.floor(n / 3) + (n % 3 === 1 ? 4 : n % 3 === 2 ? 7 : 0);
  if (mode === Mode.Alnum) return 11 * Math.floor(n / 2) + 6 * (n % 2);
  return 8 * n;
}

function detectMode(text: string): Mode {
  if (/^[0-9]*$/.test(text)) return Mode.Numeric;
  for (const ch of text) if (!ALNUM.includes(ch)) return Mode.Byte;
  return Mode.Alnum;
}

const encoder = new TextEncoder();

/** Encode `text` as a QR code (ECC level L). Returns a Unicode half-block string, or null if too long. */
export function qrEncode(text: string): string | null {
  if (text == null) return null;

  const mode = detectMode(text);
  const bytes = mode === Mode.Byte ? encoder.encode(text) : null;
  const len = bytes ? bytes.length : text.length;
  if (len > 7089) return null;

  let ver = 0;
  for (let v = 1; v <= 40; v++) {
    const cap =
      Math.floor(rawModules(v) / 8) - ECC_PER_BLOCK[v]! * NUM_BLOCKS[v]!;
    if (4 + ccBits(mode, v) + dataBits(mode, len) <= cap * 8) {
      ver = v;
      break;
    }
  }
  if (!ver) return null;

  const nb = NUM_BLOCKS[ver]!;
  const ecl = ECC_PER_BLOCK[ver]!;
  const raw = Math.floor(rawModules(ver) / 8);
  const dataCw = raw - ecl * nb;

  // --- Bit stream ---
  const bits = new Bits();
  bits.put(mode, 4);
  bits.put(len, ccBits(mode, ver));

  if (mode === Mode.Numeric) {
    for (let i = 0; i < len;) {
      const k = Math.min(len - i, 3);
      bits.put(
        parseInt(text.slice(i, i + k), 10),
        k === 3 ? 10 : k === 2 ? 7 : 4,
      );
      i += k;
    }
  } else if (mode === Mode.Alnum) {
    for (let i = 0; i < len; i += 2) {
      if (i + 1 < len)
        bits.put(
          ALNUM.indexOf(text[i]!) * 45 + ALNUM.indexOf(text[i + 1]!),
          11,
        );
      else bits.put(ALNUM.indexOf(text[i]!), 6);
    }
  } else {
    for (const b of bytes!) bits.put(b, 8);
  }

  const capBits = dataCw * 8;
  bits.put(0, Math.min(capBits - bits.len, 4));
  while (bits.len & 7) bits.put(0, 1);
  for (let pad = 0xec; bits.len < capBits; pad ^= 0xec ^ 0x11) bits.put(pad, 8);

  // --- Reed-Solomon + interleave ---
  const nshort = nb - (raw % nb);
  const shortLen = Math.floor(raw / nb);
  const gen = rsGenerator(ecl);
  const dptr: Uint8Array[] = [];
  const ecc: Uint8Array[] = [];
  let off = 0;
  for (let b = 0; b < nb; b++) {
    const dl = shortLen - ecl + (b < nshort ? 0 : 1);
    const d = bits.data.subarray(off, off + dl);
    dptr.push(d);
    ecc.push(rsRemainder(d, gen, ecl));
    off += dl;
  }

  const finalCw: number[] = [];
  const maxd = shortLen - ecl + 1;
  for (let i = 0; i < maxd; i++)
    for (let b = 0; b < nb; b++) {
      const d = dptr[b]!;
      if (i < d.length) finalCw.push(d[i]!);
    }
  for (let i = 0; i < ecl; i++)
    for (let b = 0; b < nb; b++) finalCw.push(ecc[b]![i]!);

  // --- Matrix ---
  const q = new QR(ver);
  q.drawFunctionPatterns();
  q.drawCodewords(Uint8Array.from(finalCw));

  let best = 0;
  let bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    q.applyMask(m);
    q.drawFormat(m);
    const s = q.penalty();
    if (s < bestScore) {
      bestScore = s;
      best = m;
    }
    q.applyMask(m); // undo
  }
  q.applyMask(best);
  q.drawFormat(best);

  return q.render();
}
