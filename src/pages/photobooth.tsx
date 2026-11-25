
import { useEffect, useRef, useState } from 'react';
import photoboothFrame from '../assets/images/photobooth-frame.png';
import './photobooth.css';

type Photo = {
  url: string;
  zoom: number;
  x: number;
  y: number;
};

const WIDTH = 1535;
const HEIGHT = 2048;

const SLOTS = [
  { x: 102, y: 166, w: 564, h: 437 },
  { x: 97, y: 716, w: 574, h: 508 },
  { x: 78, y: 1304, w: 397, h: 508 },
];

export default function Photobooth() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [photos, setPhotos] = useState<(Photo | null)[]>([
    null,
    null,
    null,
  ]);

  const [activePhoto, setActivePhoto] = useState(0);

  const selectedPhoto = photos[activePhoto];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) return;

    const draw = async () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      const frame = new Image();
      frame.src = photoboothFrame;

      await new Promise<void>((resolve) => {
        frame.onload = () => resolve();
        frame.onerror = () => resolve();
      });

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (!photo) continue;

        const slot = SLOTS[i];
        const img = new Image();
        img.src = photo.url;

        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });

        if (!img.naturalWidth) continue;

        const scale =
          Math.max(
            slot.w / img.naturalWidth,
            slot.h / img.naturalHeight,
          ) * photo.zoom;

        const drawW = img.naturalWidth * scale;
        const drawH = img.naturalHeight * scale;

        const drawX =
          slot.x + (slot.w - drawW) * (photo.x / 100);

        const drawY =
          slot.y + (slot.h - drawH) * (photo.y / 100);

        ctx.save();
        ctx.beginPath();
        ctx.rect(slot.x, slot.y, slot.w, slot.h);
        ctx.clip();

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();
      }

      // Frame is drawn last, preserving the original person and decorations.
      if (frame.complete && frame.naturalWidth) {
        ctx.drawImage(frame, 0, 0, WIDTH, HEIGHT);
      }
    };

    draw();
  }, [photos]);

  const handleUpload = (index: number, file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;

    const url = URL.createObjectURL(file);

    setPhotos((prev) => {
      const next = [...prev];

      if (next[index]) {
        URL.revokeObjectURL(next[index]!.url);
      }

      next[index] = {
        url,
        zoom: 1,
        x: 50,
        y: 50,
      };

      return next;
    });
  };

  const updatePhoto = (
    index: number,
    key: 'zoom' | 'x' | 'y',
    value: number,
  ) => {
    setPhotos((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;

      next[index] = {
        ...next[index]!,
        [key]: value,
      };

      return next;
    });
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || photos.some((photo) => !photo)) return;

    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = 'wooyoung-photobooth.png';
      link.click();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  };

  return (
    <main className="photobooth-page">
      <header className="photobooth-header">
        <h1>Low Budget Photobooth
        <br />
        for Wooyoungie Special Day!</h1>
      </header>

      <section className="photobooth-layout">
        <div className="photobooth-preview">
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
          />
        </div>

        <div className="photobooth-controls">
          <div className="photo-control">
            <h2>Choose your photo</h2>

            <div className="photo-tabs">
              {[0, 1, 2].map((index) => (
                <button
                  key={index}
                  className={
                    activePhoto === index
                      ? 'photo-tab active'
                      : 'photo-tab'
                  }
                  onClick={() => setActivePhoto(index)}
                >
                  {index + 1}
                  {photos[index] && <span> ✓</span>}
                </button>
              ))}
            </div>

            <h2>Photo {activePhoto + 1}</h2>

            <label className="upload-button">
              {selectedPhoto ? 'Change photo' : 'Upload photo'}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  handleUpload(
                    activePhoto,
                    e.target.files?.[0],
                  );
                  e.target.value = '';
                }}
              />
            </label>

            {selectedPhoto ? (
              <>
                <label>
                  Zoom
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={selectedPhoto.zoom}
                    onChange={(e) =>
                      updatePhoto(
                        activePhoto,
                        'zoom',
                        Number(e.target.value),
                      )
                    }
                  />
                </label>

                <label>
                  Horizontal position
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedPhoto.x}
                    onChange={(e) =>
                      updatePhoto(
                        activePhoto,
                        'x',
                        Number(e.target.value),
                      )
                    }
                  />
                </label>

                <label>
                  Vertical position
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedPhoto.y}
                    onChange={(e) =>
                      updatePhoto(
                        activePhoto,
                        'y',
                        Number(e.target.value),
                      )
                    }
                  />
                </label>
              </>
            ) : (
              <p className="photobooth-note">
                Upload a picture to adjust its position and zoom ♡
              </p>
            )}
          </div>

          <button
            className="download-button"
            disabled={photos.some((photo) => !photo)}
            onClick={download}
          >
            Download my photobooth ♡
          </button>

          <p className="photobooth-note">
            Your photos stay in your browser.
          </p>
        </div>
      </section>
    </main>
  );
}
