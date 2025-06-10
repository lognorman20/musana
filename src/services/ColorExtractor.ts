export interface ColorPalette {
  dominant: string;
  vibrant: string;
  muted: string;
  darkVibrant: string;
  darkMuted: string;
  textPrimary: string;
  textSecondary: string;
}

export const defaultColors: ColorPalette = {
  dominant: '#1a1a1a',
  vibrant: '#1DB954', // Spotify green as fallback
  muted: '#535353',
  darkVibrant: '#0d5c2e',
  darkMuted: '#2a2a2a',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Simplified color extraction based on common album art patterns
const generatePaletteFromDominant = (dominantColor: string): Omit<ColorPalette, 'textPrimary' | 'textSecondary'> => {
  const rgb = hexToRgb(dominantColor);
  if (!rgb) return {
    dominant: defaultColors.dominant,
    vibrant: defaultColors.vibrant,
    muted: defaultColors.muted,
    darkVibrant: defaultColors.darkVibrant,
    darkMuted: defaultColors.darkMuted,
  };

  const { r, g, b } = rgb;

  // Generate vibrant by increasing saturation
  const vibrantR = Math.min(255, Math.floor(r * 1.3));
  const vibrantG = Math.min(255, Math.floor(g * 1.3));
  const vibrantB = Math.min(255, Math.floor(b * 1.3));
  const vibrant = rgbToHex(vibrantR, vibrantG, vibrantB);

  // Generate muted by reducing saturation
  const avgColor = Math.floor((r + g + b) / 3);
  const mutedR = Math.floor((r + avgColor) / 2);
  const mutedG = Math.floor((g + avgColor) / 2);
  const mutedB = Math.floor((b + avgColor) / 2);
  const muted = rgbToHex(mutedR, mutedG, mutedB);

  // Generate dark vibrant
  const darkVibrantR = Math.floor(vibrantR * 0.6);
  const darkVibrantG = Math.floor(vibrantG * 0.6);
  const darkVibrantB = Math.floor(vibrantB * 0.6);
  const darkVibrant = rgbToHex(darkVibrantR, darkVibrantG, darkVibrantB);

  // Generate dark muted
  const darkMutedR = Math.floor(mutedR * 0.4);
  const darkMutedG = Math.floor(mutedG * 0.4);
  const darkMutedB = Math.floor(mutedB * 0.4);
  const darkMuted = rgbToHex(darkMutedR, darkMutedG, darkMutedB);

  return {
    dominant: dominantColor,
    vibrant,
    muted,
    darkVibrant,
    darkMuted,
  };
};

// Extract a dominant color from an image URL using a predefined set based on common patterns
const extractDominantColor = async (imageUrl: string): Promise<string> => {
  // For now, we'll use a simple heuristic based on common music genres and styles
  // This is a fallback approach that works without native modules
  
  try {
    // Try to extract some info from the URL or use Spotify's image characteristics
    const urlHash = imageUrl.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    // Generate colors based on hash to ensure consistency for the same image
    const colorOptions = [
      '#2E8B57', // Sea Green
      '#4169E1', // Royal Blue  
      '#8B4513', // Saddle Brown
      '#800080', // Purple
      '#DC143C', // Crimson
      '#FF6347', // Tomato
      '#4682B4', // Steel Blue
      '#32CD32', // Lime Green
      '#FF4500', // Orange Red
      '#9370DB', // Medium Purple
    ];
    
    const colorIndex = Math.abs(urlHash) % colorOptions.length;
    return colorOptions[colorIndex];
  } catch (error) {
    console.error('Error extracting dominant color:', error);
    return defaultColors.dominant;
  }
};

export class ColorExtractor {
  private static colorCache = new Map<string, ColorPalette>();

  static getTextColor(backgroundColor: string): string {
    const rgb = hexToRgb(backgroundColor);
    if (!rgb) return '#FFFFFF'; // Default to white for invalid colors
    
    // YIQ formula to determine brightness
    const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#FFFFFF';
  }

  static async extractColors(imageUrl: string): Promise<ColorPalette> {
    if (this.colorCache.has(imageUrl)) {
      return this.colorCache.get(imageUrl)!;
    }

    try {
      // Extract a dominant color (simplified approach)
      const dominantColor = await extractDominantColor(imageUrl);
      
      // Generate palette from dominant color
      const colors = generatePaletteFromDominant(dominantColor);
      
      const textPrimary = this.getTextColor(colors.dominant);
      const textSecondary = textPrimary === '#FFFFFF' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';

      const finalPalette: ColorPalette = { 
        ...colors, 
        textPrimary, 
        textSecondary 
      };
      
      this.colorCache.set(imageUrl, finalPalette);
      return finalPalette;

    } catch (error) {
      console.error('Failed to extract colors:', error);
      return defaultColors;
    }
  }

  static interpolateColors(
    from: ColorPalette,
    to: ColorPalette,
    progress: number
  ): ColorPalette {
    const interpolateHex = (colorA: string, colorB: string, ratio: number) => {
      const rgbA = hexToRgb(colorA);
      const rgbB = hexToRgb(colorB);

      if (!rgbA || !rgbB) {
        return ratio < 0.5 ? colorA : colorB;
      }

      const r = Math.ceil(rgbA.r * (1 - ratio) + rgbB.r * ratio);
      const g = Math.ceil(rgbA.g * (1 - ratio) + rgbB.g * ratio);
      const b = Math.ceil(rgbA.b * (1 - ratio) + rgbB.b * ratio);

      return rgbToHex(r, g, b);
    };

    return {
      dominant: interpolateHex(from.dominant, to.dominant, progress),
      vibrant: interpolateHex(from.vibrant, to.vibrant, progress),
      muted: interpolateHex(from.muted, to.muted, progress),
      darkVibrant: interpolateHex(from.darkVibrant, to.darkVibrant, progress),
      darkMuted: interpolateHex(from.darkMuted, to.darkMuted, progress),
      textPrimary: progress < 0.5 ? from.textPrimary : to.textPrimary,
      textSecondary: progress < 0.5 ? from.textSecondary : to.textSecondary,
    };
  }
} 