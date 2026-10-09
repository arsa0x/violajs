#include "qr.h"
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#define MAX_SIZE 177
#define QUIET 4

static const int8_t ECC_PER_BLOCK[41] = {
    -1, 7,  10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26,
    30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30};
static const int8_t NUM_BLOCKS[41] = {
    -1, 1,  1,  1,  1,  1,  2,  2,  2,  2,  4,  4,  4,  4,
    4,  6,  6,  6,  6,  7,  8,  8,  9,  9,  10, 12, 12, 12,
    13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25};

static const char ALNUM[] = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

typedef struct {
  int size;
  uint8_t mod[MAX_SIZE][MAX_SIZE];
  uint8_t fn[MAX_SIZE][MAX_SIZE];
} QR;

typedef struct {
  uint8_t d[3100];
  int len;
} Bits;

static void putBits(Bits *b, uint32_t v, int n) {
  for (int i = n - 1; i >= 0; i--) {
    if ((b->len & 7) == 0)
      b->d[b->len >> 3] = 0;
    b->d[b->len >> 3] |= ((v >> i) & 1) << (7 - (b->len & 7));
    b->len++;
  }
}

static uint8_t gfMul(uint8_t x, uint8_t y) {
  int z = 0;
  for (int i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >> 7) * 0x11D);
    z ^= ((y >> i) & 1) * x;
  }
  return (uint8_t)z;
}

static void rsGenerator(int deg, uint8_t *g) {
  memset(g, 0, deg);
  g[deg - 1] = 1;
  uint8_t root = 1;
  for (int i = 0; i < deg; i++) {
    for (int j = 0; j < deg; j++) {
      g[j] = gfMul(g[j], root);
      if (j + 1 < deg)
        g[j] ^= g[j + 1];
    }
    root = gfMul(root, 2);
  }
}

static void rsRemainder(const uint8_t *data, int len, const uint8_t *g, int deg,
                        uint8_t *res) {
  memset(res, 0, deg);
  for (int i = 0; i < len; i++) {
    uint8_t f = data[i] ^ res[0];
    memmove(res, res + 1, deg - 1);
    res[deg - 1] = 0;
    for (int j = 0; j < deg; j++)
      res[j] ^= gfMul(g[j], f);
  }
}

static int rawModules(int v) {
  int r = (16 * v + 128) * v + 64;
  if (v >= 2) {
    int na = v / 7 + 2;
    r -= (25 * na - 10) * na - 55;
    if (v >= 7)
      r -= 36;
  }
  return r;
}

static int alignPositions(int v, int *p) {
  if (v == 1)
    return 0;
  int na = v / 7 + 2, size = v * 4 + 17;
  int step = (v == 32) ? 26 : (v * 4 + na * 2 + 1) / (na * 2 - 2) * 2;
  p[0] = 6;
  for (int i = na - 1, pos = size - 7; i >= 1; i--, pos -= step)
    p[i] = pos;
  return na;
}

static void setFn(QR *q, int x, int y, int dark) {
  q->mod[y][x] = (uint8_t)dark;
  q->fn[y][x] = 1;
}

static void drawFinder(QR *q, int cx, int cy) {
  for (int dy = -4; dy <= 4; dy++)
    for (int dx = -4; dx <= 4; dx++) {
      int x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= q->size || y >= q->size)
        continue;
      int dist = abs(dx) > abs(dy) ? abs(dx) : abs(dy);
      setFn(q, x, y, dist != 2 && dist != 4);
    }
}

static void drawAlign(QR *q, int cx, int cy) {
  for (int dy = -2; dy <= 2; dy++)
    for (int dx = -2; dx <= 2; dx++) {
      int dist = abs(dx) > abs(dy) ? abs(dx) : abs(dy);
      setFn(q, cx + dx, cy + dy, dist != 1);
    }
}

static void drawFormat(QR *q, int mask) {
  int n = q->size;
  int data = (1 << 3) | mask;
  int rem = data;
  for (int i = 0; i < 10; i++)
    rem = (rem << 1) ^ ((rem >> 9) * 0x537);
  int bits = ((data << 10) | rem) ^ 0x5412;
#define BIT(i) (((bits) >> (i)) & 1)
  for (int i = 0; i <= 5; i++)
    setFn(q, 8, i, BIT(i));
  setFn(q, 8, 7, BIT(6));
  setFn(q, 8, 8, BIT(7));
  setFn(q, 7, 8, BIT(8));
  for (int i = 9; i < 15; i++)
    setFn(q, 14 - i, 8, BIT(i));
  for (int i = 0; i < 8; i++)
    setFn(q, n - 1 - i, 8, BIT(i));
  for (int i = 8; i < 15; i++)
    setFn(q, 8, n - 15 + i, BIT(i));
  setFn(q, 8, n - 8, 1);
#undef BIT
}

static void drawVersion(QR *q, int ver) {
  int rem = ver;
  for (int i = 0; i < 12; i++)
    rem = (rem << 1) ^ ((rem >> 11) * 0x1F25);
  int bits = (ver << 12) | rem;
  for (int i = 0; i < 18; i++) {
    int bit = (bits >> i) & 1;
    int a = q->size - 11 + i % 3, b = i / 3;
    setFn(q, a, b, bit);
    setFn(q, b, a, bit);
  }
}

static void drawFunctionPatterns(QR *q, int ver) {
  int n = q->size;
  for (int i = 0; i < n; i++) {
    setFn(q, 6, i, i % 2 == 0);
    setFn(q, i, 6, i % 2 == 0);
  }
  drawFinder(q, 3, 3);
  drawFinder(q, n - 4, 3);
  drawFinder(q, 3, n - 4);
  int p[8];
  int na = alignPositions(ver, p);
  for (int i = 0; i < na; i++)
    for (int j = 0; j < na; j++) {
      if ((i == 0 && j == 0) || (i == 0 && j == na - 1) ||
          (i == na - 1 && j == 0))
        continue;
      drawAlign(q, p[i], p[j]);
    }
  drawFormat(q, 0);
  if (ver >= 7)
    drawVersion(q, ver);
}

static void drawCodewords(QR *q, const uint8_t *cw, int nbytes) {
  int n = q->size, i = 0, total = nbytes * 8;
  for (int right = n - 1; right >= 1; right -= 2) {
    if (right == 6)
      right = 5;
    for (int vert = 0; vert < n; vert++)
      for (int j = 0; j < 2; j++) {
        int x = right - j;
        int up = ((right + 1) & 2) == 0;
        int y = up ? n - 1 - vert : vert;
        if (!q->fn[y][x] && i < total) {
          q->mod[y][x] = (cw[i >> 3] >> (7 - (i & 7))) & 1;
          i++;
        }
      }
  }
}

static int maskHit(int m, int x, int y) {
  switch (m) {
  case 0:
    return (x + y) % 2 == 0;
  case 1:
    return y % 2 == 0;
  case 2:
    return x % 3 == 0;
  case 3:
    return (x + y) % 3 == 0;
  case 4:
    return (x / 3 + y / 2) % 2 == 0;
  case 5:
    return x * y % 2 + x * y % 3 == 0;
  case 6:
    return (x * y % 2 + x * y % 3) % 2 == 0;
  default:
    return ((x + y) % 2 + x * y % 3) % 2 == 0;
  }
}

static void applyMask(QR *q, int m) {
  for (int y = 0; y < q->size; y++)
    for (int x = 0; x < q->size; x++)
      if (!q->fn[y][x] && maskHit(m, x, y))
        q->mod[y][x] ^= 1;
}

static int penalty(const QR *q) {
  int n = q->size, score = 0;
  for (int dir = 0; dir < 2; dir++)
    for (int a = 0; a < n; a++) {
      int run = 0, last = -1;
      uint32_t w = 0;
      for (int b = 0; b < n; b++) {
        int c = dir ? q->mod[b][a] : q->mod[a][b];
        if (c == last) {
          run++;
          if (run == 5)
            score += 3;
          else if (run > 5)
            score += 1;
        } else {
          run = 1;
          last = c;
        }
        w = ((w << 1) | c) & 0x7FF;
        if (b >= 10 && (w == 0x5D0 || w == 0x05D))
          score += 40;
      }
    }
  int dark = 0;
  for (int y = 0; y < n; y++)
    for (int x = 0; x < n; x++) {
      dark += q->mod[y][x];
      if (x < n - 1 && y < n - 1) {
        int c = q->mod[y][x];
        if (c == q->mod[y][x + 1] && c == q->mod[y + 1][x] &&
            c == q->mod[y + 1][x + 1])
          score += 3;
      }
    }
  int total = n * n;
  int k = (abs(dark * 20 - total * 10) + total - 1) / total - 1;
  score += k * 10;
  return score;
}

static int ccBits(int mode, int ver) {
  int i = ver <= 9 ? 0 : (ver <= 26 ? 1 : 2);
  static const int num[3] = {10, 12, 14}, aln[3] = {9, 11, 13},
                   byt[3] = {8, 16, 16};
  return mode == 1 ? num[i] : mode == 2 ? aln[i] : byt[i];
}

static long dataBits(int mode, size_t n) {
  if (mode == 1)
    return 10L * (n / 3) + (n % 3 == 1 ? 4 : n % 3 == 2 ? 7 : 0);
  if (mode == 2)
    return 11L * (n / 2) + 6L * (n % 2);
  return 8L * n;
}

static int alnumIdx(char c) { return (int)(strchr(ALNUM, c) - ALNUM); }

static char *render(const QR *q) {
  int n = q->size, w = n + QUIET * 2;
  int rows = (w + 1) / 2;
  size_t cap = (size_t)rows * ((size_t)w * 3 + 1) + 1;
  char *out = malloc(cap);
  if (!out)
    return NULL;
  size_t pos = 0;
  for (int y = -QUIET; y < n + QUIET; y += 2) {
    for (int x = -QUIET; x < n + QUIET; x++) {
      int top = x >= 0 && x < n && y >= 0 && y < n && q->mod[y][x];
      int bot = x >= 0 && x < n && y + 1 >= 0 && y + 1 < n && q->mod[y + 1][x];
      if (top && bot) {
        out[pos++] = (char)0xE2;
        out[pos++] = (char)0x96;
        out[pos++] = (char)0x88;
      } else if (top) {
        out[pos++] = (char)0xE2;
        out[pos++] = (char)0x96;
        out[pos++] = (char)0x80;
      } else if (bot) {
        out[pos++] = (char)0xE2;
        out[pos++] = (char)0x96;
        out[pos++] = (char)0x84;
      } else {
        out[pos++] = ' ';
      }
    }
    out[pos++] = '\n';
  }
  out[pos] = '\0';
  return out;
}

char *qrEncode(const char *text) {
  if (!text)
    return NULL;
  size_t len = strlen(text);
  if (len > 7089)
    return NULL;

  int mode = 1;
  for (size_t i = 0; i < len; i++)
    if (text[i] < '0' || text[i] > '9') {
      mode = 2;
      break;
    }
  if (mode == 2)
    for (size_t i = 0; i < len; i++)
      if (!strchr(ALNUM, text[i])) {
        mode = 4;
        break;
      }

  int ver = 0;
  for (int v = 1; v <= 40; v++) {
    int cap = rawModules(v) / 8 - ECC_PER_BLOCK[v] * NUM_BLOCKS[v];
    if (4 + ccBits(mode, v) + dataBits(mode, len) <= (long)cap * 8) {
      ver = v;
      break;
    }
  }
  if (!ver)
    return NULL;

  int nb = NUM_BLOCKS[ver], ecl = ECC_PER_BLOCK[ver];
  int raw = rawModules(ver) / 8;
  int dataCw = raw - ecl * nb;

  Bits bits;
  bits.len = 0;
  putBits(&bits, mode, 4);
  putBits(&bits, (uint32_t)len, ccBits(mode, ver));
  if (mode == 1) {
    for (size_t i = 0; i < len;) {
      size_t k = len - i < 3 ? len - i : 3;
      uint32_t v = 0;
      for (size_t j = 0; j < k; j++)
        v = v * 10 + (text[i + j] - '0');
      putBits(&bits, v, k == 3 ? 10 : k == 2 ? 7 : 4);
      i += k;
    }
  } else if (mode == 2) {
    for (size_t i = 0; i < len; i += 2) {
      if (i + 1 < len)
        putBits(&bits, alnumIdx(text[i]) * 45 + alnumIdx(text[i + 1]), 11);
      else
        putBits(&bits, alnumIdx(text[i]), 6);
    }
  } else {
    for (size_t i = 0; i < len; i++)
      putBits(&bits, (uint8_t)text[i], 8);
  }
  int capBits = dataCw * 8;
  int term = capBits - bits.len < 4 ? capBits - bits.len : 4;
  putBits(&bits, 0, term);
  while (bits.len & 7)
    putBits(&bits, 0, 1);
  for (uint8_t pad = 0xEC; bits.len < capBits; pad ^= 0xEC ^ 0x11)
    putBits(&bits, pad, 8);

  int nshort = nb - raw % nb, shortLen = raw / nb;
  uint8_t gen[30], ecc[25][30];
  int dlen[25];
  const uint8_t *dptr[25];
  rsGenerator(ecl, gen);
  int off = 0;
  for (int b = 0; b < nb; b++) {
    dlen[b] = shortLen - ecl + (b < nshort ? 0 : 1);
    dptr[b] = bits.d + off;
    rsRemainder(dptr[b], dlen[b], gen, ecl, ecc[b]);
    off += dlen[b];
  }
  uint8_t final_cw[3800];
  int k = 0, maxd = shortLen - ecl + 1;
  for (int i = 0; i < maxd; i++)
    for (int b = 0; b < nb; b++)
      if (i < dlen[b])
        final_cw[k++] = dptr[b][i];
  for (int i = 0; i < ecl; i++)
    for (int b = 0; b < nb; b++)
      final_cw[k++] = ecc[b][i];

  QR *q = calloc(1, sizeof(QR));
  if (!q)
    return NULL;
  q->size = ver * 4 + 17;
  drawFunctionPatterns(q, ver);
  drawCodewords(q, final_cw, k);

  int best = 0, bestScore = 1 << 30;
  for (int m = 0; m < 8; m++) {
    applyMask(q, m);
    drawFormat(q, m);
    int s = penalty(q);
    if (s < bestScore) {
      bestScore = s;
      best = m;
    }
    applyMask(q, m);
  }
  applyMask(q, best);
  drawFormat(q, best);

  char *res = render(q);
  free(q);
  return res;
}
