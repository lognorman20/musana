import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { ColorPalette, defaultColors, ColorExtractor } from '../services/ColorExtractor';

interface ColorContextValue {
  colors: ColorPalette;
  animatedColors: ColorPalette;
  isTransitioning: boolean;
  updateColors: (trackId: string, albumArtUrl: string) => Promise<void>;
}

const ColorContext = createContext<ColorContextValue | undefined>(undefined);

const COLOR_TRANSITION_DURATION = 300;
const colorCache = new Map<string, ColorPalette>();

function interpolateHexColor(a: string, b: string, t: number): string {
  const ah = a.replace('#', '');
  const bh = b.replace('#', '');
  const ar = parseInt(ah.substring(0, 2), 16);
  const ag = parseInt(ah.substring(2, 4), 16);
  const ab = parseInt(ah.substring(4, 6), 16);
  const br = parseInt(bh.substring(0, 2), 16);
  const bg = parseInt(bh.substring(2, 4), 16);
  const bb = parseInt(bh.substring(4, 6), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b_ = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b_).toString(16).slice(1)}`;
}

function interpolatePalette(from: ColorPalette, to: ColorPalette, t: number): ColorPalette {
  return {
    dominant: interpolateHexColor(from.dominant, to.dominant, t),
    vibrant: interpolateHexColor(from.vibrant, to.vibrant, t),
    muted: interpolateHexColor(from.muted, to.muted, t),
    darkVibrant: interpolateHexColor(from.darkVibrant, to.darkVibrant, t),
    darkMuted: interpolateHexColor(from.darkMuted, to.darkMuted, t),
    textPrimary: t < 0.5 ? from.textPrimary : to.textPrimary,
    textSecondary: t < 0.5 ? from.textSecondary : to.textSecondary,
  };
}

export const ColorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colors, setColors] = useState<ColorPalette>(defaultColors);
  const [animatedColors, setAnimatedColors] = useState<ColorPalette>(defaultColors);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const lastTrackId = useRef<string | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const animationFrame = useRef<number | null>(null);
  const prevPalette = useRef<ColorPalette>(defaultColors);

  const updateColors = useCallback(async (trackId: string, albumArtUrl: string) => {
    if (lastTrackId.current === trackId) return;
    lastTrackId.current = trackId;
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    setIsTransitioning(true);
    debounceTimeout.current = setTimeout(async () => {
      let palette: ColorPalette = defaultColors;
      if (colorCache.has(trackId)) {
        palette = colorCache.get(trackId)!;
      } else {
        try {
          palette = await ColorExtractor.extractColors(albumArtUrl);
          colorCache.set(trackId, palette);
        } catch (e) {
          palette = defaultColors;
        }
      }
      setColors(palette);
      prevPalette.current = animatedColors;
      // Animate with requestAnimationFrame
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / COLOR_TRANSITION_DURATION);
        setAnimatedColors(interpolatePalette(prevPalette.current, palette, t));
        if (t < 1) {
          animationFrame.current = requestAnimationFrame(animate);
        } else {
          setIsTransitioning(false);
        }
      };
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = requestAnimationFrame(animate);
    }, 100); // Debounce 100ms
  }, [animatedColors]);

  // Clean up animation frame on unmount
  React.useEffect(() => {
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    };
  }, []);

  return (
    <ColorContext.Provider value={{ colors, animatedColors, isTransitioning, updateColors }}>
      {children}
    </ColorContext.Provider>
  );
};

export const useColors = () => {
  const ctx = useContext(ColorContext);
  if (!ctx) throw new Error('useColors must be used within ColorProvider');
  return ctx.colors;
};

export const useAnimatedColors = () => {
  const ctx = useContext(ColorContext);
  if (!ctx) throw new Error('useAnimatedColors must be used within ColorProvider');
  return ctx.animatedColors;
};

export const useColorContext = () => {
  const ctx = useContext(ColorContext);
  if (!ctx) throw new Error('useColorContext must be used within ColorProvider');
  return ctx;
}; 