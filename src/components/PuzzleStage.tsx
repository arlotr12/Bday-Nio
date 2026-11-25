import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BOARD_H, BOARD_W, JigsawPiece } from '../utils/jigsaw';
import { playCompletionChord, playSnapSound } from '../utils/sound';
import { JigsawPieceSvg } from './JigsawPieceSvg';

interface LoosePosition {
  x: number;
  y: number;
}

interface ActiveDrag {
  pieceId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  hasMoved: boolean;
}

interface PuzzleStageProps {
  pieces: JigsawPiece[];
  imageUrl: string;
  originalImageUrl: string;
  lockedIds: number[];
  onLockPiece: (id: number) => void;
  onAllLocked: () => void;
  onOpenEnvelope: () => void;
  onReturnIntro: () => void;
}

const SNAP_THRESHOLD = 36;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.4;

export const PuzzleStage: React.FC<PuzzleStageProps> = ({
  pieces,
  imageUrl,
  originalImageUrl,
  lockedIds,
  onLockPiece,
  onAllLocked,
  onOpenEnvelope,
  onReturnIntro,
}) => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [boardWidth, setBoardWidth] = useState<number>(720);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null);
  const [loosePositions, setLoosePositions] = useState<Record<number, LoosePosition>>({});
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState<number>(1);
  const [justSnappedId, setJustSnappedId] = useState<number | null>(null);
  const completionTriggeredRef = useRef<boolean>(false);

  // Zoom & Pan state for the completed original picture
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panDragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const scale = boardWidth / BOARD_W;
  const allLocked = lockedIds.length === pieces.length;

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setBoardWidth(rect.width);
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (allLocked && !completionTriggeredRef.current) {
      completionTriggeredRef.current = true;
      playCompletionChord();
      const timer = window.setTimeout(() => {
        onAllLocked();
      }, 900);
      return () => window.clearTimeout(timer);
    }
    if (!allLocked) {
      completionTriggeredRef.current = false;
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [allLocked, onAllLocked]);

  const clampPan = (nx: number, ny: number, targetZoom: number) => {
    if (targetZoom <= 1) return { x: 0, y: 0 };
    const el = boardRef.current;
    if (!el) return { x: nx, y: ny };
    const maxX = ((targetZoom - 1) * el.clientWidth) / 2;
    const maxY = ((targetZoom - 1) * el.clientHeight) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, nx)),
      y: Math.max(-maxY, Math.min(maxY, ny)),
    };
  };

  const applyZoom = (nextZoomRaw: number) => {
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(nextZoomRaw.toFixed(2))));
    setZoom(nextZoom);
    setPan((prev) => clampPan(prev.x, prev.y, nextZoom));
  };

  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!allLocked) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    applyZoom(zoom + delta);
  };

  const handleImagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!allLocked || zoom <= 1) return;
    e.preventDefault();
    panDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: pan.x,
      originY: pan.y,
    };
  };

  useEffect(() => {
    if (!allLocked) return;
    const onMove = (e: PointerEvent) => {
      if (!panDragRef.current) return;
      const dx = e.clientX - panDragRef.current.startX;
      const dy = e.clientY - panDragRef.current.startY;
      setPan(
        clampPan(panDragRef.current.originX + dx, panDragRef.current.originY + dy, zoom)
      );
    };
    const onUp = () => {
      panDragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [allLocked, zoom]);

  const trayPieces = useMemo(() => {
    const remaining = pieces.filter(
      (p) => !lockedIds.includes(p.id) && !(p.id in loosePositions)
    );
    return [...remaining].sort((a, b) => {
      const ha = Math.sin((a.id + 1) * 31.7 * shuffleSeed) * 10000;
      const hb = Math.sin((b.id + 1) * 31.7 * shuffleSeed) * 10000;
      return (ha - Math.floor(ha)) - (hb - Math.floor(hb));
    });
  }, [pieces, lockedIds, loosePositions, shuffleSeed]);

  const loosePieces = useMemo(() => {
    return pieces.filter((p) => !lockedIds.includes(p.id) && p.id in loosePositions);
  }, [pieces, lockedIds, loosePositions]);

  const lockedPieces = useMemo(() => {
    return pieces.filter((p) => lockedIds.includes(p.id));
  }, [pieces, lockedIds]);

  const pieceById = useMemo(() => {
    const map = new Map<number, JigsawPiece>();
    for (const p of pieces) map.set(p.id, p);
    return map;
  }, [pieces]);

  const clientToBoardCell = (clientX: number, clientY: number, piece: JigsawPiece) => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const bx = (clientX - rect.left) / (rect.width / BOARD_W);
    const by = (clientY - rect.top) / (rect.height / BOARD_H);
    return {
      cellX: bx - piece.w / 2,
      cellY: by - piece.h / 2,
      rawX: bx,
      rawY: by,
    };
  };

  const trySnapOrDrop = (piece: JigsawPiece, clientX: number, clientY: number) => {
    const coords = clientToBoardCell(clientX, clientY, piece);
    if (!coords) return;

    const dist = Math.hypot(coords.cellX - piece.x, coords.cellY - piece.y);
    if (dist <= SNAP_THRESHOLD) {
      setLoosePositions((prev) => {
        const next = { ...prev };
        delete next[piece.id];
        return next;
      });
      setSelectedPieceId(null);
      setJustSnappedId(piece.id);
      window.setTimeout(() => setJustSnappedId((curr) => (curr === piece.id ? null : curr)), 450);
      if (lockedIds.length + 1 < pieces.length) {
        playSnapSound();
      }
      onLockPiece(piece.id);
      return;
    }

    const insideBoard =
      coords.rawX >= -20 &&
      coords.rawX <= BOARD_W + 20 &&
      coords.rawY >= -20 &&
      coords.rawY <= BOARD_H + 20;

    if (insideBoard) {
      const clampedX = Math.max(-20, Math.min(BOARD_W - piece.w + 20, coords.cellX));
      const clampedY = Math.max(-20, Math.min(BOARD_H - piece.h + 20, coords.cellY));
      setLoosePositions((prev) => ({
        ...prev,
        [piece.id]: { x: clampedX, y: clampedY },
      }));
      setSelectedPieceId(piece.id);
    } else {
      setLoosePositions((prev) => {
        const next = { ...prev };
        delete next[piece.id];
        return next;
      });
    }
  };

  useEffect(() => {
    if (!activeDrag) return;

    const handlePointerMove = (e: PointerEvent) => {
      setActiveDrag((prev) => {
        if (!prev) return null;
        const moved =
          prev.hasMoved ||
          Math.hypot(e.clientX - prev.startX, e.clientY - prev.startY) > 5;
        return {
          ...prev,
          currentX: e.clientX,
          currentY: e.clientY,
          hasMoved: moved,
        };
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      const piece = pieceById.get(activeDrag.pieceId);
      if (piece) {
        if (activeDrag.hasMoved) {
          trySnapOrDrop(piece, e.clientX, e.clientY);
        } else {
          setSelectedPieceId((curr) => (curr === piece.id ? null : piece.id));
        }
      }
      setActiveDrag(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  });

  const handlePiecePointerDown = (e: React.PointerEvent, pieceId: number) => {
    if (lockedIds.includes(pieceId)) return;
    e.preventDefault();
    e.stopPropagation();
    setActiveDrag({
      pieceId,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      hasMoved: false,
    });
  };

  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (allLocked || selectedPieceId === null || activeDrag?.hasMoved) return;
    const piece = pieceById.get(selectedPieceId);
    if (!piece || lockedIds.includes(piece.id)) return;
    trySnapOrDrop(piece, e.clientX, e.clientY);
  };

  const draggedPiece = activeDrag?.hasMoved ? pieceById.get(activeDrag.pieceId) ?? null : null;

  return (
    <main className="relative flex h-full w-full flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5">
      {/* Compact Header */}
      <header className="mx-auto flex w-full max-w-6xl shrink-0 flex-wrap items-center justify-between gap-3 pb-3">
        <div className="text-left">
          <h1 className="text-xl font-bold italic text-[#e8d7b5] sm:text-2xl">
            {allLocked ? 'The Picture, Reunited' : 'Reunite the Picture'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs tracking-wider text-[#e8d7b5]">
          {!allLocked ? (
            <>
              <span className="tabular-nums text-sm">
                Pieces placed: <strong className="text-[#fffaf0]">{lockedIds.length}</strong> / 26
              </span>

              <button
                type="button"
                onClick={() => setShowGuide((g) => !g)}
                className={`cursor-pointer border-0 bg-transparent px-3 py-1.5 uppercase tracking-widest text-[#e8d7b5] outline-none transition-opacity ${
                  showGuide ? 'opacity-100' : 'opacity-65 hover:opacity-100'
                }`}
              >
                {showGuide ? 'Hide Guide' : 'Show Guide'}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 tabular-nums">
                <button
                  type="button"
                  onClick={() => applyZoom(zoom - ZOOM_STEP)}
                  disabled={zoom <= MIN_ZOOM}
                  aria-label="Zoom out"
                  className="cursor-pointer border-0 bg-transparent px-2 py-1 text-base text-[#e8d7b5] opacity-70 outline-none transition-opacity hover:opacity-100 disabled:cursor-default disabled:opacity-30"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => applyZoom(1)}
                  title="Reset zoom"
                  className="cursor-pointer border-0 bg-transparent px-1.5 py-1 text-xs uppercase tracking-widest text-[#e8d7b5] opacity-75 outline-none transition-opacity hover:opacity-100"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => applyZoom(zoom + ZOOM_STEP)}
                  disabled={zoom >= MAX_ZOOM}
                  aria-label="Zoom in"
                  className="cursor-pointer border-0 bg-transparent px-2 py-1 text-base text-[#e8d7b5] opacity-70 outline-none transition-opacity hover:opacity-100 disabled:cursor-default disabled:opacity-30"
                >
                  +
                </button>
              </div>

              <a
                href={originalImageUrl}
                download="FRAME PUZZLE.jpg"
                className="cursor-pointer border-0 bg-transparent px-3 py-1.5 uppercase tracking-widest text-[#e8d7b5] opacity-70 no-underline outline-none transition-opacity hover:opacity-100"
              >
                Download
              </a>

              <button
                type="button"
                onClick={onOpenEnvelope}
                className="cursor-pointer border-0 bg-transparent px-3 py-1.5 uppercase tracking-widest text-[#e8d7b5] opacity-70 outline-none transition-opacity hover:opacity-100"
              >
                Open Envelope
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onReturnIntro}
            className="cursor-pointer border-0 bg-transparent px-3 py-1.5 uppercase tracking-widest text-[#e8d7b5] opacity-65 outline-none transition-opacity hover:opacity-100"
          >
            Return
          </button>
        </div>
      </header>

      {/* Main Puzzle Workspace: Outlineless Board + Piece Tray */}
      <div className="mx-auto mt-3 flex min-h-0 w-full max-w-6xl flex-1 flex-col items-center justify-center gap-5 lg:flex-row lg:items-stretch">
        {/* Left/Center: Clean Recessed Puzzle Surface (no outline) */}
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
          <div
            ref={boardRef}
            onClick={handleBoardClick}
            onWheel={handleWheelZoom}
            onPointerDown={handleImagePointerDown}
            onDoubleClick={() => {
              if (!allLocked) return;
              applyZoom(zoom > 1 ? 1 : 2);
            }}
            className={`relative w-full select-none bg-[#120c07]/60 shadow-[0_24px_70px_rgba(0,0,0,0.75)] transition-all duration-500 ${
              allLocked
                ? `overflow-hidden ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`
                : 'overflow-visible'
            }`}
            style={{
              aspectRatio: `${BOARD_W} / ${BOARD_H}`,
              maxWidth: allLocked
                ? 'min(960px, 92vw, calc((100dvh - 165px) * 16 / 9))'
                : 'min(800px, 92vw, calc((100dvh - 200px) * 16 / 9))',
              touchAction: allLocked && zoom > 1 ? 'none' : 'auto',
            }}
          >
            {/* Optional ghost guide */}
            {showGuide && !allLocked && (
              <img
                src={imageUrl}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
              />
            )}

            {/* Original bright picture revealed when all 26 pieces lock, with zoom & pan */}
            {allLocked && (
              <img
                src={originalImageUrl}
                alt="Original reunited picture"
                draggable={false}
                className="pointer-events-none absolute inset-0 z-20 h-full w-full object-contain transition-transform duration-100 ease-out"
                style={{
                  transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                  transformOrigin: 'center center',
                }}
              />
            )}

            {/* Locked Pieces (no outlines) */}
            {!allLocked &&
              lockedPieces.map((piece) => {
                const isJustSnapped = justSnappedId === piece.id;
                return (
                  <div
                    key={piece.id}
                    className={`pointer-events-none absolute z-10 transition-transform duration-300 ${
                      isJustSnapped ? 'scale-[1.03]' : 'scale-100'
                    }`}
                    style={{
                      left: `${(piece.vbX / BOARD_W) * 100}%`,
                      top: `${(piece.vbY / BOARD_H) * 100}%`,
                      width: `${(piece.vbW / BOARD_W) * 100}%`,
                      height: `${(piece.vbH / BOARD_H) * 100}%`,
                    }}
                  >
                    <JigsawPieceSvg
                      piece={piece}
                      imageUrl={imageUrl}
                      width="100%"
                      height="100%"
                      showStroke={false}
                      withShadow={false}
                    />
                  </div>
                );
              })}

            {/* Loose (un-snapped) pieces placed freely on the board */}
            {!allLocked &&
              loosePieces.map((piece) => {
                if (draggedPiece?.id === piece.id) return null;
                const pos = loosePositions[piece.id];
                const isSelected = selectedPieceId === piece.id;
                const vbLeft = pos.x - (piece.x - piece.vbX);
                const vbTop = pos.y - (piece.y - piece.vbY);

                return (
                  <div
                    key={piece.id}
                    onPointerDown={(e) => handlePiecePointerDown(e, piece.id)}
                    style={{
                      left: `${(vbLeft / BOARD_W) * 100}%`,
                      top: `${(vbTop / BOARD_H) * 100}%`,
                      width: `${(piece.vbW / BOARD_W) * 100}%`,
                      height: `${(piece.vbH / BOARD_H) * 100}%`,
                      touchAction: 'none',
                    }}
                    className={`absolute z-20 cursor-grab active:cursor-grabbing ${
                      isSelected ? 'brightness-110' : ''
                    }`}
                  >
                    <JigsawPieceSvg
                      piece={piece}
                      imageUrl={imageUrl}
                      width="100%"
                      height="100%"
                      showStroke={false}
                    />
                  </div>
                );
              })}
          </div>

          <p className="mt-2.5 text-center text-xs tracking-wide text-[#e8d7b5]/75">
            {allLocked
              ? zoom > 1
                ? 'Drag to pan around the picture, scroll or use + / − to zoom, or click Download to save.'
                : 'Scroll, double-click, or use + / − to zoom in, and click Download to keep the original picture.'
              : selectedPieceId !== null
              ? 'Piece selected — drag it onto the board or click near its matching spot.'
              : 'Drag puzzle pieces from the tray onto the board. Pieces snap when near their place.'}
          </p>
        </div>

        {/* Right / Bottom: Outlineless Piece Tray */}
        {!allLocked && (
          <aside className="flex w-full shrink-0 flex-col bg-[#16100a]/72 p-3.5 shadow-xl backdrop-blur-sm lg:w-[330px]">
            <div className="mb-2.5 flex items-center justify-between pb-2">
              <span className="text-xs uppercase tracking-[0.2em] text-[#e8d7b5]/85">
                Recovered Tray ({trayPieces.length})
              </span>
              <button
                type="button"
                onClick={() => setShuffleSeed((s) => s + 1)}
                className="cursor-pointer border-0 bg-transparent px-2.5 py-1 text-[11px] uppercase tracking-widest text-[#e8d7b5] opacity-65 outline-none transition-opacity hover:opacity-100"
              >
                Shuffle
              </button>
            </div>

            <div className="grid max-h-[190px] grid-cols-4 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-6 lg:max-h-none lg:flex-1 lg:grid-cols-3 lg:content-start">
              {trayPieces.map((piece) => {
                const isSelected = selectedPieceId === piece.id;
                const isBeingDragged = draggedPiece?.id === piece.id;
                return (
                  <button
                    key={piece.id}
                    type="button"
                    onPointerDown={(e) => handlePiecePointerDown(e, piece.id)}
                    aria-label={`Puzzle piece ${piece.id + 1}`}
                    style={{ touchAction: 'none' }}
                    className={`flex aspect-square cursor-grab items-center justify-center p-1.5 transition-all active:cursor-grabbing ${
                      isBeingDragged
                        ? 'opacity-25'
                        : isSelected
                        ? 'bg-[#b99a6b]/25 brightness-110'
                        : 'bg-[#1d150e]/55 hover:bg-[#2a1f15]/75'
                    }`}
                  >
                    <JigsawPieceSvg
                      piece={piece}
                      imageUrl={imageUrl}
                      width="100%"
                      height="100%"
                      showStroke={false}
                    />
                  </button>
                );
              })}

              {trayPieces.length === 0 && (
                <p className="col-span-full py-6 text-center text-sm italic text-[#e8d7b5]/70">
                  All remaining pieces are on the board.
                </p>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Floating dragged piece scaled identically to the board */}
      {draggedPiece && activeDrag && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50"
          style={{
            left: activeDrag.currentX,
            top: activeDrag.currentY,
            width: draggedPiece.vbW * scale,
            height: draggedPiece.vbH * scale,
            transform: 'translate(-50%, -50%) scale(1.03)',
          }}
        >
          <JigsawPieceSvg
            piece={draggedPiece}
            imageUrl={imageUrl}
            width="100%"
            height="100%"
            showStroke={false}
          />
        </div>
      )}
    </main>
  );
};
