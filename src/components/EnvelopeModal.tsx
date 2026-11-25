import React, { useState } from 'react';
import { LetterContent } from '../puzzleConfig';
import { playEnvelopeOpenSound } from '../utils/sound';

interface EnvelopeModalProps {
  letter: LetterContent;
  onCloseViewPicture: () => void;
  onPlayAgain: () => void;
}

export const EnvelopeModal: React.FC<EnvelopeModalProps> = ({
  letter,
  onCloseViewPicture,
  onPlayAgain,
}) => {
  // 'sealed' -> envelope pops up; 'opening' -> flap opens & letter slides out; 'reading' -> full letter displayed
  const [phase, setPhase] = useState<'sealed' | 'opening' | 'reading'>('sealed');

  const handleOpenEnvelope = () => {
    if (phase !== 'sealed') return;
    playEnvelopeOpenSound();
    setPhase('opening');
    window.setTimeout(() => {
      setPhase('reading');
    }, 950);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090603]/82 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Hidden Letter"
    >
      {phase !== 'reading' ? (
        <div className="flex flex-col items-center text-center">
          <div className="eyebrow mb-3">An Envelope is Found Under the Pieces</div>
          <h2 className="mb-8 text-2xl italic text-[#fffaf0] sm:text-3xl">
            {phase === 'sealed'
              ? 'An envelope has been waiting for you.'
              : 'Opening the letter...'}
          </h2>

          {/* Interactive Tactile Envelope */}
          <button
            type="button"
            onClick={handleOpenEnvelope}
            aria-label="Click to open envelope"
            className="group relative cursor-pointer border-0 bg-transparent outline-none"
            style={{ perspective: '1000px' }}
          >
            <div className="relative h-[220px] w-[330px] transition-transform duration-300 group-hover:scale-[1.03] sm:h-[250px] sm:w-[380px]">
              {/* Envelope Back Body */}
              <div className="absolute inset-0 rounded-sm border border-[#9e7c52] bg-[#cbb28a] shadow-[0_24px_60px_rgba(0,0,0,0.85)]" />

              {/* Rising Letter Sheet inside Envelope */}
              <div
                className={`absolute inset-x-4 bottom-3 top-3 rounded-xs border border-[#d6c29d] bg-[#f7eedc] px-5 py-4 text-left text-[#2b1f14] shadow-md transition-all duration-700 ease-out ${
                  phase === 'opening'
                    ? '-translate-y-28 scale-105 opacity-100'
                    : 'translate-y-0 opacity-95'
                }`}
              >
                <p className="text-sm italic text-[#4d3824]">{letter.greeting}</p>
                <div className="mt-2 space-y-1.5">
                  <div className="h-1.5 w-4/5 rounded-full bg-[#3d2b1a]/15" />
                  <div className="h-1.5 w-full rounded-full bg-[#3d2b1a]/15" />
                  <div className="h-1.5 w-3/4 rounded-full bg-[#3d2b1a]/15" />
                </div>
              </div>

              {/* Envelope Front Pocket (Left/Right/Bottom Triangles via SVG) */}
              <svg
                viewBox="0 0 380 250"
                className="pointer-events-none absolute inset-0 h-full w-full"
                preserveAspectRatio="none"
              >
                <polygon
                  points="0,0 190,145 0,250"
                  fill="#d8c19b"
                  stroke="#b39267"
                  strokeWidth="1"
                />
                <polygon
                  points="380,0 190,145 380,250"
                  fill="#d2ba92"
                  stroke="#b39267"
                  strokeWidth="1"
                />
                <polygon
                  points="0,250 190,128 380,250"
                  fill="#dfc8a4"
                  stroke="#b39267"
                  strokeWidth="1"
                />
              </svg>

              {/* Top Flap (Flips open on click) */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[56%] origin-top transition-transform duration-500 ease-out"
                style={{
                  transform:
                    phase === 'opening' ? 'rotateX(175deg)' : 'rotateX(0deg)',
                  transformStyle: 'preserve-3d',
                  zIndex: phase === 'opening' ? 0 : 20,
                }}
              >
                <svg
                  viewBox="0 0 380 140"
                  className="h-full w-full drop-shadow-md"
                  preserveAspectRatio="none"
                >
                  <polygon
                    points="0,0 380,0 190,136"
                    fill="#e5d0ad"
                    stroke="#ab895e"
                    strokeWidth="1.2"
                  />
                </svg>

                {/* Crimson Wax Seal */}
                <div
                  className={`absolute left-1/2 top-[76%] flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#5c1616] bg-[#8a2222] text-[#f5dec0] shadow-[0_4px_12px_rgba(0,0,0,0.45)] transition-opacity duration-200 ${
                    phase === 'opening' ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  <span
                    className="text-2xl leading-none"
                    style={{ fontFamily: '"UnifrakturMaguntia", "IM Fell English", serif' }}
                  >
                    L
                  </span>
                </div>
              </div>
            </div>
          </button>

          <p className="mt-7 text-sm uppercase tracking-[0.25em] text-[#e8d7b5]/85">
            {phase === 'sealed' ? 'Open the Envelope' : 'Unfolding letter...'}
          </p>
        </div>
      ) : (
        /* Unfolded Parchment Letter */
        <div className="relative max-h-[88vh] w-full max-w-xl overflow-y-auto border border-[#b99a6b] bg-[#f4e8d1] px-7 py-8 text-[#2a1d12] shadow-[0_28px_80px_rgba(0,0,0,0.9)] sm:px-11 sm:py-10">
          <div className="border-b border-[#8c6e47]/30 pb-3 text-center text-[11px] uppercase tracking-[0.3em] text-[#6d5233]">
            A Letter Found in the Dark
          </div>

          <div className="mt-6 space-y-4 text-left text-lg leading-relaxed sm:text-[19px]">
            <p className="font-bold italic text-[#2a1d12]">{letter.greeting}</p>

            {letter.paragraphs.map((para, idx) => (
              <p key={idx} className="text-[#362618]">
                {para}
              </p>
            ))}

            <p className="whitespace-pre-line pt-4 italic text-[#2a1d12]">
              {letter.signature}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 border-t border-[#8c6e47]/30 pt-6">
            <button
              type="button"
              onClick={onCloseViewPicture}
              className="cursor-pointer border-0 bg-transparent px-3 py-2 text-xs uppercase tracking-[0.2em] text-[#362618] opacity-65 outline-none transition-opacity hover:opacity-100"
            >
              View Picture
            </button>
            <button
              type="button"
              onClick={onPlayAgain}
              className="cursor-pointer border-0 bg-transparent px-3 py-2 text-xs uppercase tracking-[0.2em] text-[#362618] opacity-65 outline-none transition-opacity hover:opacity-100"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
