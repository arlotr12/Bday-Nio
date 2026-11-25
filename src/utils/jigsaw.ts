export const BOARD_W = 840;
export const BOARD_H = 472;
export const PIECE_PAD = 28;

// 7 + 6 + 7 + 6 = 26 interlocking jigsaw pieces
const ROW_COLS = [7, 6, 7, 6] as const;

interface Point {
  x: number;
  y: number;
}

interface CubicSeg {
  p0: Point;
  c1: Point;
  c2: Point;
  p3: Point;
}

export interface JigsawPiece {
  id: number;
  row: number;
  col: number;
  // Base cell bounding box inside BOARD_W x BOARD_H (without tabs)
  x: number;
  y: number;
  w: number;
  h: number;
  // Padded SVG viewBox covering outward tabs
  vbX: number;
  vbY: number;
  vbW: number;
  vbH: number;
  // Closed SVG path in board coordinates
  pathD: string;
}

function buildTabEdge(a: Point, b: Point, sign: -1 | 0 | 1): CubicSeg[] {
  if (sign === 0) {
    const mid1 = { x: a.x + (b.x - a.x) / 3, y: a.y + (b.y - a.y) / 3 };
    const mid2 = { x: a.x + ((b.x - a.x) * 2) / 3, y: a.y + ((b.y - a.y) * 2) / 3 };
    return [{ p0: a, c1: mid1, c2: mid2, p3: b }];
  }

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  // Left-hand normal relative to direction a -> b
  const nx = (-dy / len) * sign;
  const ny = (dx / len) * sign;

  const pt = (along: number, normal: number): Point => ({
    x: a.x + ux * along + nx * normal,
    y: a.y + uy * along + ny * normal,
  });

  const m = len * 0.5;
  const s = Math.min(20, len * 0.24);

  const p0 = a;
  const p1 = pt(m - s * 0.44, 0);
  const p2 = pt(m, s * 1.02);
  const p3 = pt(m + s * 0.44, 0);
  const p4 = b;

  return [
    {
      p0,
      c1: pt(m * 0.36, 0),
      c2: pt(m - s * 0.72, -s * 0.08),
      p3: p1,
    },
    {
      p0: p1,
      c1: pt(m - s * 0.22, s * 0.26),
      c2: pt(m - s * 0.9, s * 1.02),
      p3: p2,
    },
    {
      p0: p2,
      c1: pt(m + s * 0.9, s * 1.02),
      c2: pt(m + s * 0.22, s * 0.26),
      p3: p3,
    },
    {
      p0: p3,
      c1: pt(m + s * 0.72, -s * 0.08),
      c2: pt(len - m * 0.36, 0),
      p3: p4,
    },
  ];
}

function reverseSegments(segs: CubicSeg[]): CubicSeg[] {
  return [...segs].reverse().map((s) => ({
    p0: s.p3,
    c1: s.c2,
    c2: s.c1,
    p3: s.p0,
  }));
}

function segmentsToPathCommands(segs: CubicSeg[]): string {
  return segs
    .map(
      (s) =>
        `C ${s.c1.x.toFixed(2)} ${s.c1.y.toFixed(2)}, ${s.c2.x.toFixed(2)} ${s.c2.y.toFixed(2)}, ${s.p3.x.toFixed(2)} ${s.p3.y.toFixed(2)}`
    )
    .join(' ');
}

function deterministicSign(seed: number): -1 | 1 {
  const hash = Math.sin(seed * 91.3458) * 47453.5453;
  return hash - Math.floor(hash) > 0.5 ? 1 : -1;
}

export function generate26JigsawPieces(): JigsawPiece[] {
  const rowCount = ROW_COLS.length;
  const rowH = BOARD_H / rowCount;

  // Compute exact x cuts per row
  const rowXCuts: number[][] = ROW_COLS.map((cols) => {
    const cuts: number[] = [];
    for (let c = 0; c <= cols; c++) {
      cuts.push((c * BOARD_W) / cols);
    }
    return cuts;
  });

  // Precompute horizontal seam segments between row r and row r+1
  interface HSeamSubSeg {
    xStart: number;
    xEnd: number;
    segs: CubicSeg[];
  }

  const hSeams: HSeamSubSeg[][] = [];
  for (let r = 0; r < rowCount - 1; r++) {
    const y = (r + 1) * rowH;
    const mergedCuts = Array.from(new Set([...rowXCuts[r], ...rowXCuts[r + 1]])).sort(
      (a, b) => a - b
    );
    const subSegs: HSeamSubSeg[] = [];
    for (let i = 0; i < mergedCuts.length - 1; i++) {
      const xStart = mergedCuts[i];
      const xEnd = mergedCuts[i + 1];
      const width = xEnd - xStart;
      // Put a jigsaw tab on sub-segments wide enough to cleanly fit a tab
      const sign: -1 | 0 | 1 =
        width >= 55 ? deterministicSign((r + 1) * 100 + i * 7 + 3) : 0;
      subSegs.push({
        xStart,
        xEnd,
        segs: buildTabEdge({ x: xStart, y }, { x: xEnd, y }, sign),
      });
    }
    hSeams.push(subSegs);
  }

  // Precompute vertical seam segments between col c and col c+1 within each row
  const vSeams: CubicSeg[][][] = [];
  for (let r = 0; r < rowCount; r++) {
    const cols = ROW_COLS[r];
    const yTop = r * rowH;
    const yBottom = (r + 1) * rowH;
    const rowV: CubicSeg[][] = [];
    for (let c = 0; c < cols - 1; c++) {
      const x = rowXCuts[r][c + 1];
      const sign = deterministicSign((r + 1) * 313 + (c + 1) * 19);
      rowV.push(buildTabEdge({ x, y: yTop }, { x, y: yBottom }, sign));
    }
    vSeams.push(rowV);
  }

  const pieces: JigsawPiece[] = [];
  let idCounter = 0;

  for (let r = 0; r < rowCount; r++) {
    const cols = ROW_COLS[r];
    const yTop = r * rowH;
    const yBottom = (r + 1) * rowH;

    for (let c = 0; c < cols; c++) {
      const xLeft = rowXCuts[r][c];
      const xRight = rowXCuts[r][c + 1];

      // 1. Top edge (xLeft -> xRight)
      let topSegs: CubicSeg[];
      if (r === 0) {
        topSegs = buildTabEdge({ x: xLeft, y: yTop }, { x: xRight, y: yTop }, 0);
      } else {
        topSegs = hSeams[r - 1]
          .filter((sub) => sub.xStart >= xLeft - 0.01 && sub.xEnd <= xRight + 0.01)
          .flatMap((sub) => sub.segs);
      }

      // 2. Right edge (yTop -> yBottom)
      const rightSegs: CubicSeg[] =
        c === cols - 1
          ? buildTabEdge({ x: xRight, y: yTop }, { x: xRight, y: yBottom }, 0)
          : vSeams[r][c];

      // 3. Bottom edge (xRight -> xLeft, reversed seam!)
      let bottomSegs: CubicSeg[];
      if (r === rowCount - 1) {
        bottomSegs = buildTabEdge({ x: xRight, y: yBottom }, { x: xLeft, y: yBottom }, 0);
      } else {
        const forward = hSeams[r]
          .filter((sub) => sub.xStart >= xLeft - 0.01 && sub.xEnd <= xRight + 0.01)
          .flatMap((sub) => sub.segs);
        bottomSegs = reverseSegments(forward);
      }

      // 4. Left edge (yBottom -> yTop, reversed seam!)
      const leftSegs: CubicSeg[] =
        c === 0
          ? buildTabEdge({ x: xLeft, y: yBottom }, { x: xLeft, y: yTop }, 0)
          : reverseSegments(vSeams[r][c - 1]);

      const allSegs = [...topSegs, ...rightSegs, ...bottomSegs, ...leftSegs];
      const pathD = `M ${xLeft.toFixed(2)} ${yTop.toFixed(2)} ${segmentsToPathCommands(allSegs)} Z`;

      const vbX = xLeft - PIECE_PAD;
      const vbY = yTop - PIECE_PAD;
      const vbW = xRight - xLeft + PIECE_PAD * 2;
      const vbH = yBottom - yTop + PIECE_PAD * 2;

      pieces.push({
        id: idCounter++,
        row: r,
        col: c,
        x: xLeft,
        y: yTop,
        w: xRight - xLeft,
        h: yBottom - yTop,
        vbX,
        vbY,
        vbW,
        vbH,
        pathD,
      });
    }
  }

  return pieces;
}
