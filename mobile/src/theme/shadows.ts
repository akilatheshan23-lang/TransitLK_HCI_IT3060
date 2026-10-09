import { Platform, ViewStyle } from 'react-native';

export interface ShadowOptions {
  color?: string;
  width?: number;
  height?: number;
  opacity?: number;
  radius?: number;
  elevation?: number;
}

function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  if (c.length === 6) {
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export function platformShadow({
  color = '#000000',
  width = 0,
  height = 2,
  opacity = 0.1,
  radius = 4,
  elevation = 2,
}: ShadowOptions = {}): ViewStyle {
  if (Platform.OS === 'web') {
    const shadowColor = color.startsWith('#') ? hexToRgba(color, opacity) : color;
    return {
      boxShadow: `${width}px ${height}px ${radius}px ${shadowColor}`,
    } as any;
  }
  return {
    shadowColor: color,
    shadowOffset: { width, height },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}
