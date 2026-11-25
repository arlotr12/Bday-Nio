export interface LetterContent {
  greeting: string;
  paragraphs: string[];
  signature: string;
}

export interface PuzzleConfig {
  imageUrl: string;
  originalImageUrl: string;
  letter: LetterContent;
}

export const DEFAULT_PUZZLE_CONFIG: PuzzleConfig = {
  imageUrl: '/src/assets/images/FRAME%20PUZZLE_DARL.jpg',
  originalImageUrl: '/src/assets/images/FRAME%20PUZZLE.jpg',
  letter: {
    greeting: 'Dear, Arsenio',
    paragraphs: [
      'Every scattered piece you gathered from the dark carried a quiet memory of its own—and together, at last, they form the whole picture once more.',
      'Thank you for being born and for gracing this little world with your beautiful, strong presence. You are the cutest, most handsome, prettiest boy I could ever ask for, ' +
        'and I am so lucky to have you. I hope you stay by my side for a very, very long time, because I still have so much love to give you. I love you more than words could ever say! ♡',
      'May this small keepsake remind you that even when things feel scattered across the dark, patience and curiosity can always bring them home.',
    ],
    signature: 'Sincerely, Ala',
  },
};

const STORAGE_KEY = 'the_missing_pieces_config_v1';

export function loadPuzzleConfig(): PuzzleConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PUZZLE_CONFIG;
    const parsed = JSON.parse(raw) as Partial<PuzzleConfig>;
    return {
      imageUrl: parsed.imageUrl || DEFAULT_PUZZLE_CONFIG.imageUrl,
      originalImageUrl: parsed.originalImageUrl || DEFAULT_PUZZLE_CONFIG.originalImageUrl,
      letter: {
        greeting: parsed.letter?.greeting ?? DEFAULT_PUZZLE_CONFIG.letter.greeting,
        paragraphs:
          Array.isArray(parsed.letter?.paragraphs) && parsed.letter.paragraphs.length > 0
            ? parsed.letter.paragraphs
            : DEFAULT_PUZZLE_CONFIG.letter.paragraphs,
        signature: parsed.letter?.signature ?? DEFAULT_PUZZLE_CONFIG.letter.signature,
      },
    };
  } catch {
    return DEFAULT_PUZZLE_CONFIG;
  }
}

export function savePuzzleConfig(config: PuzzleConfig): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore quota errors cleanly if a very large custom image is uploaded
  }
}

export function resetPuzzleConfig(): PuzzleConfig {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
  return DEFAULT_PUZZLE_CONFIG;
}
