import React, { useCallback, useMemo, useRef, useState } from 'react';
import { JigsawPiece } from '../utils/jigsaw';
import { playCompletionChord, playDiscoverChime } from '../utils/sound';
import { JigsawPieceSvg } from './JigsawPieceSvg';

interface DarkRoomStageProps {
  pieces: JigsawPiece[];
  imageUrl: string;
  foundIds: number[];
  onFindPiece: (id: number) => void;
  onProceedToPuzzle: () => void;
  onReturnIntro: () => void;
}

export const DarkRoomStage: React.FC<DarkRoomStageProps> = ({
  pieces,
  imageUrl,
  foundIds,
  onFindPiece,
  onProceedToPuzzle,
  onReturnIntro,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showProgressMenu, setShowProgressMenu] = useState<boolean>(false);
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: 50, y: 55 });
  const stageRef = useRef<HTMLElement | null>(null);

  const scatteredPositions = useMemo(() => {
    const order = [...pieces].sort((a, b) => {
      const ha = Math.sin(a.id * 17.31) * 10000;
      const hb = Math.sin(b.id * 17.31) * 10000;
      return (ha - Math.floor(ha)) - (hb - Math.floor(hb));
    });

    return order.map((piece, slotIndex) => {
      const cols = 7;
      const rows = 4;
      const col = slotIndex % cols;
      const row = Math.floor(slotIndex / cols);

      const cellW = 84 / cols;
      const cellH = 66 / rows;

      const jx = (((piece.id * 43) % 10) / 10 - 0.5) * (cellW * 0.48);
      const jy = (((piece.id * 61) % 10) / 10 - 0.5) * (cellH * 0.48);

      const left = Math.min(92, Math.max(8, 8 + col * cellW + cellW / 2 + jx));
      const top = Math.min(90, Math.max(16, 16 + row * cellH + cellH / 2 + jy));
      const rotation = ((piece.id * 37) % 44) - 22;

      return {
        piece,
        left,
        top,
        rotation,
      };
    });
  }, [pieces]);

  const updatePointer = useCallback((clientX: number, clientY: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setPointer({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });
  }, []);

  const handleCollect = (id: number) => {
    if (!isPlaying || foundIds.includes(id)) return;
    const willFinish = foundIds.length + 1 === pieces.length;
    onFindPiece(id);
    if (willFinish) {
      playCompletionChord();
    } else {
      playDiscoverChime();
    }
  };

  const allFound = foundIds.length === pieces.length;
  const progressPct = Math.round((foundIds.length / pieces.length) * 100);

  return (
    <main
      ref={stageRef}
      className="screen select-none"
      id="stage"
      onMouseMove={(e) => updatePointer(e.clientX, e.clientY)}
      onTouchMove={(e) => {
        if (e.touches.length > 0) {
          updatePointer(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchStart={(e) => {
        if (e.touches.length > 0) {
          updatePointer(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
    >
      {/* Scattered puzzle pieces hidden in the darkness */}
      <div className="absolute inset-0 z-10">
        {scatteredPositions.map(({ piece, left, top, rotation }) => {
          const isFound = foundIds.includes(piece.id);
          return (
            <button
              key={piece.id}
              type="button"
              onClick={() => handleCollect(piece.id)}
              aria-label={`Collect puzzle piece ${piece.id + 1}`}
              disabled={!isPlaying || isFound}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              }}
              className={`absolute flex items-center justify-center border-0 bg-transparent p-1 outline-none transition-all duration-300 ${
                isFound
                  ? 'pointer-events-none scale-75 opacity-0'
                  : isPlaying
                  ? 'cursor-pointer hover:scale-110'
                  : 'pointer-events-none'
              }`}
            >
              <JigsawPieceSvg
                piece={piece}
                imageUrl={imageUrl}
                width={76}
                height={62}
                showStroke={false}
              />
            </button>
          );
        })}
      </div>

      {/* Flashlight beam darkness overlay */}
      {!allFound && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 transition-[background] duration-75"
          style={{
            background: isPlaying
              ? `radial-gradient(circle 175px at ${pointer.x}% ${pointer.y}%, rgba(255, 240, 210, 0.04) 0%, rgba(12, 9, 6, 0.56) 46%, rgba(8, 6, 4, 0.96) 80%)`
              : 'rgba(8, 6, 4, 0.92)',
          }}
        />
      )}

      {/* Stage 1 Intro Overlay (hidden as soon as Play is clicked) */}
      {!isPlaying && !allFound && (
        <div className="relative z-30 flex flex-col items-center text-center">
          <h1 className="my-1.5 text-[clamp(30px,4.5vw,48px)] font-bold italic text-[#e8d7b5] drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            The Dark Room
          </h1>
          <p className="description !text-base sm:!text-lg">
            Take your flashlight and find all 26 missing pieces.
          </p>
          <button
            type="button"
            onClick={() => setIsPlaying(true)}
            className="mt-7 cursor-pointer border-0 bg-transparent px-6 py-2 text-base uppercase tracking-[0.25em] text-[#e8d7b5] opacity-70 outline-none transition-opacity hover:opacity-100"
          >
            Play
          </button>
        </div>
      )}

      {/* Progress Button shown while actively searching */}
      {isPlaying && !allFound && (
        <div className="fixed right-5 top-5 z-30">
          <button
            type="button"
            onClick={() => setShowProgressMenu((prev) => !prev)}
            className="cursor-pointer border-0 bg-transparent px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-[#e8d7b5] opacity-70 tabular-nums outline-none transition-opacity hover:opacity-100"
          >
            Progress · {foundIds.length} / 26
          </button>
        </div>
      )}

      {/* Progress Details Popover */}
      {showProgressMenu && !allFound && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#080604]/75 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Search Progress"
        >
          <div className="w-full max-w-sm border border-[#b99a6b]/65 bg-[#18120c] px-7 py-6 text-center shadow-2xl">
            <h2 className="text-2xl font-bold italic text-[#fffaf0]">
              Search Progress
            </h2>
            <p className="mt-2 text-sm text-[#e8d7b5]/85 tabular-nums">
              {foundIds.length} of 26 fragments recovered ({progressPct}%)
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden bg-[#2b1f14]">
              <div
                className="h-full bg-[#b99a6b] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-6 flex justify-center gap-6">
              <button
                type="button"
                onClick={() => setShowProgressMenu(false)}
                className="cursor-pointer border-0 bg-transparent px-3 py-2 text-xs uppercase tracking-widest text-[#e8d7b5] opacity-70 outline-none transition-opacity hover:opacity-100"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={onReturnIntro}
                className="cursor-pointer border-0 bg-transparent px-3 py-2 text-xs uppercase tracking-widest text-[#e8d7b5] opacity-70 outline-none transition-opacity hover:opacity-100"
              >
                Title Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion prompt advancing to Stage 2 */}
      {allFound && (
        <div className="relative z-40 my-auto max-w-lg bg-[#18120c]/92 px-8 py-8 shadow-2xl backdrop-blur-sm">
          <h2 className="text-3xl font-bold italic text-[#fffaf0]">
            Now, reunite the picture.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#e8d7b5]">
            Every scattered puzzle piece has been rescued from the dark.
          </p>
          <div className="mt-6 flex justify-center border-t border-[#e8d7b5]/20 pt-5">
            <button
              type="button"
              onClick={onProceedToPuzzle}
              className="cursor-pointer border-0 bg-transparent px-4 py-2 text-sm uppercase tracking-[0.2em] text-[#e8d7b5] opacity-75 outline-none transition-opacity hover:opacity-100"
            >
              Puzzle? Assemble!
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
