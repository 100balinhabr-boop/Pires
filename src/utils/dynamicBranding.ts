import type { CSSProperties } from 'react';
import { ClientBranding, BackgroundStyle } from '../types';

export function hexWithAlpha(hex: string, alpha: number): string {
  const clean = (hex || '#dc2626').replace('#', '');
  const safe = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean.padEnd(6, '0').slice(0, 6);
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return `#${safe}${a}`;
}

export function applyDynamicBranding(branding: ClientBranding) {
  if (typeof window === 'undefined') return;

  // 1. Atualizar título da página
  if (branding.appName && branding.appName.trim()) {
    document.title = `${branding.appName.trim()} • IPTV Player`;
  }

  // 2. Atualizar Favicon se houver logoUrl e faviconSync for true (ou indefinido)
  if (branding.faviconSync !== false && branding.logoUrl) {
    try {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.logoUrl;
    } catch {
      // Falha silenciosa caso o navegador restrinja
    }
  }

  // 3. Atualizar Meta theme-color se existir
  try {
    let themeMeta = document.querySelector("meta[name='theme-color']") as HTMLMetaElement | null;
    if (!themeMeta) {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = branding.accentColor || '#dc2626';
  } catch {
    // Ignorar
  }
}

export function getBackgroundClassesAndStyles(
  style: BackgroundStyle | undefined,
  accentColor: string
): { className: string; style: CSSProperties } {
  const accent = accentColor || '#dc2626';
  
  switch (style) {
    case 'oled':
      return {
        className: 'bg-black text-slate-100',
        style: { backgroundColor: '#000000' },
      };
    case 'gradient':
      return {
        className: 'text-slate-100',
        style: {
          background: `radial-gradient(circle at 50% 0%, ${hexWithAlpha(accent, 0.25)} 0%, #08080e 70%, #040407 100%)`,
        },
      };
    case 'mesh':
      return {
        className: 'text-slate-100',
        style: {
          background: `linear-gradient(180deg, #090b14 0%, #05060a 100%)`,
        },
      };
    case 'default':
    default:
      return {
        className: 'bg-[#08080c] text-slate-100',
        style: {},
      };
  }
}
