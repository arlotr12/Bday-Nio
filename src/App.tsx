import { useMemo, useState } from 'react';
import { DarkRoomStage } from './components/DarkRoomStage';
import { EnvelopeModal } from './components/EnvelopeModal';
import { PuzzleStage } from './components/PuzzleStage';
import { DEFAULT_PUZZLE_CONFIG } from './puzzleConfig';
import { generate26JigsawPieces } from './utils/jigsaw';

type GameStage = 'intro' | 'dark-room' | 'puzzle';

export default function App() {
  const [stage, setStage] = useState<GameStage>('intro');
  const [foundIds, setFoundIds] = useState<number[]>([]);
  const [lockedIds, setLockedIds] = useState<number[]>([]);
  const [showEnvelope, setShowEnvelope] = useState<boolean>(false);

  const pieces = useMemo(() => generate26JigsawPieces(), []);
  const config = DEFAULT_PUZZLE_CONFIG;

  const handleFindPiece = (id: number) => {
    setFoundIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleLockPiece = (id: number) => {
    setLockedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handlePlayAgain = () => {
    setFoundIds([]);
    setLockedIds([]);
    setShowEnvelope(false);
    setStage('intro');
  };

  const backdropImage =
    stage === 'intro'
      ? 'linear-gradient(rgba(14, 10, 6, 0.36), rgba(14, 10, 6, 0.46))'
      : 'linear-gradient(rgba(14, 10, 6, 0.58), rgba(14, 10, 6, 0.72)), url("/src/assets/images/dark_room_backdrop_1795340351777.jpg")';

  return (
    <div
      className="page-clip"
      style={{
        backgroundImage: backdropImage,
      }}
    >
      {stage === 'intro' && (
        <main className="screen intro" id="intro">
          <div
            className="title-paper"
            aria-hidden="true"
            style={{
              backgroundImage: 'url("/src/assets/images/title.png")',
            }}
          />

          <div className="title-container">
            <h1>Scattered fragments lie in wait,</h1>
            <h2>longing to be found and reunited once more.</h2>
          </div>

          <div className="intro-cta-row">
            <button
              type="button"
              className="search-button"
              onClick={() => setStage('dark-room')}
            >
              <span>Start Collecting</span>
            </button>
          </div>
        </main>
      )}

      {stage === 'dark-room' && (
        <DarkRoomStage
          pieces={pieces}
          imageUrl={config.imageUrl}
          foundIds={foundIds}
          onFindPiece={handleFindPiece}
          onProceedToPuzzle={() => setStage('puzzle')}
          onReturnIntro={() => setStage('intro')}
        />
      )}

      {stage === 'puzzle' && (
        <PuzzleStage
          pieces={pieces}
          imageUrl={config.imageUrl}
          originalImageUrl={config.originalImageUrl}
          lockedIds={lockedIds}
          onLockPiece={handleLockPiece}
          onAllLocked={() => setShowEnvelope(true)}
          onOpenEnvelope={() => setShowEnvelope(true)}
          onReturnIntro={() => setStage('intro')}
        />
      )}

      {showEnvelope && (
        <EnvelopeModal
          letter={config.letter}
          onCloseViewPicture={() => setShowEnvelope(false)}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
