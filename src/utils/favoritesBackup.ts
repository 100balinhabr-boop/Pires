import { Channel, UserAccount } from '../types';

export interface ExportedFavoriteChannel {
  id: string;
  name: string;
  streamUrl: string;
  logoUrl?: string;
  groupTitle?: string;
  tvgId?: string;
  tvgName?: string;
  userAgent?: string;
  isFavorite?: boolean;
}

export interface FavoritesBackupFile {
  appName: string;
  version: string;
  exportType: 'iptv_favorites_backup';
  exportedAt: string;
  user: {
    id?: string;
    username?: string;
    name?: string;
  };
  totalFavorites: number;
  favoriteIds: string[];
  channels: ExportedFavoriteChannel[];
}

export interface ParsedFavoritesBackup {
  success: boolean;
  totalFound: number;
  exportedAt?: string;
  username?: string;
  favoriteIds: string[];
  channels: ExportedFavoriteChannel[];
  error?: string;
}

/**
 * Realiza o download do arquivo JSON contendo os canais favoritos locais/da conta.
 */
export function downloadFavoritesJson(
  channels: Channel[],
  currentUser?: UserAccount | null
): { success: boolean; count: number; filename?: string; error?: string } {
  try {
    const favoriteChannels = channels.filter((c) => c.isFavorite);
    const userKey = currentUser?.id || 'guest';

    // Se a lista em memória não tem favoritos marcados, verifica se há IDs no localStorage
    let savedIds: string[] = [];
    try {
      const raw = localStorage.getItem(`iptv_fav_ids_${userKey}`);
      if (raw) savedIds = JSON.parse(raw);
    } catch {}

    if (favoriteChannels.length === 0 && savedIds.length === 0) {
      return {
        success: false,
        count: 0,
        error: 'Nenhum canal favoritado encontrado para exportar.',
      };
    }

    const payloadChannels: ExportedFavoriteChannel[] = favoriteChannels.map((c) => ({
      id: c.id,
      name: c.name,
      streamUrl: c.streamUrl,
      logoUrl: c.logoUrl || '',
      groupTitle: c.groupTitle || 'Favoritos',
      tvgId: c.tvgId || '',
      tvgName: c.tvgName || '',
      userAgent: c.userAgent || '',
      isFavorite: true,
    }));

    const finalIds = Array.from(
      new Set([...favoriteChannels.map((c) => c.id), ...savedIds])
    );

    const backup: FavoritesBackupFile = {
      appName: 'RPR TV FREE',
      version: '1.0',
      exportType: 'iptv_favorites_backup',
      exportedAt: new Date().toISOString(),
      user: currentUser
        ? {
            id: currentUser.id,
            username: currentUser.username,
            name: currentUser.name,
          }
        : { username: 'usuario_local' },
      totalFavorites: payloadChannels.length > 0 ? payloadChannels.length : finalIds.length,
      favoriteIds: finalIds,
      channels: payloadChannels,
    };

    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const safeUsername = (currentUser?.username || 'usuario')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `favoritos_iptv_${safeUsername}_${dateStr}.json`;

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      count: backup.totalFavorites,
      filename,
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      error: err?.message || 'Falha ao gerar o arquivo JSON de favoritos.',
    };
  }
}

export const exportFavoritesBackup = downloadFavoritesJson;

/**
 * Analisa e valida um texto JSON de backup de favoritos, aceitando múltiplos formatos
 * (formato nativo RPR TV, arrays simples de IDs ou URLs, ou arrays de canais).
 */
export function parseFavoritesJson(jsonText: string): ParsedFavoritesBackup {
  try {
    const raw = JSON.parse(jsonText);
    if (!raw) {
      return { success: false, totalFound: 0, favoriteIds: [], channels: [], error: 'Arquivo JSON vazio.' };
    }

    const favoriteIdsSet = new Set<string>();
    const channelsList: ExportedFavoriteChannel[] = [];
    let exportedAt: string | undefined;
    let username: string | undefined;

    // Caso 1: Formato padrão FavoritesBackupFile
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      if (raw.exportedAt) exportedAt = String(raw.exportedAt);
      if (raw.user?.username) username = String(raw.user.username);

      if (Array.isArray(raw.favoriteIds)) {
        raw.favoriteIds.forEach((id: any) => {
          if (typeof id === 'string' && id.trim()) favoriteIdsSet.add(id.trim());
        });
      }

      if (Array.isArray(raw.channels)) {
        raw.channels.forEach((c: any) => {
          if (c && typeof c === 'object') {
            const id = String(c.id || c.streamUrl || c.name || '').trim();
            if (id) favoriteIdsSet.add(id);
            channelsList.push({
              id: id || `fav_${channelsList.length + 1}`,
              name: String(c.name || 'Canal Favorito'),
              streamUrl: String(c.streamUrl || ''),
              logoUrl: c.logoUrl ? String(c.logoUrl) : undefined,
              groupTitle: c.groupTitle ? String(c.groupTitle) : 'Favoritos',
              tvgId: c.tvgId ? String(c.tvgId) : undefined,
              tvgName: c.tvgName ? String(c.tvgName) : undefined,
              userAgent: c.userAgent ? String(c.userAgent) : undefined,
              isFavorite: true,
            });
          }
        });
      }

      // Caso o JSON use outra chave como 'favorites'
      if (Array.isArray(raw.favorites)) {
        raw.favorites.forEach((item: any) => {
          if (typeof item === 'string') {
            favoriteIdsSet.add(item.trim());
          } else if (item && typeof item === 'object') {
            const id = String(item.id || item.streamUrl || item.name || '').trim();
            if (id) favoriteIdsSet.add(id);
            channelsList.push({
              id: id || `fav_${channelsList.length + 1}`,
              name: String(item.name || 'Canal Favorito'),
              streamUrl: String(item.streamUrl || ''),
              logoUrl: item.logoUrl ? String(item.logoUrl) : undefined,
              groupTitle: item.groupTitle ? String(item.groupTitle) : 'Favoritos',
              isFavorite: true,
            });
          }
        });
      }
    }

    // Caso 2: Array de objetos ou array de strings
    if (Array.isArray(raw)) {
      raw.forEach((item: any) => {
        if (typeof item === 'string' && item.trim()) {
          favoriteIdsSet.add(item.trim());
        } else if (item && typeof item === 'object') {
          const id = String(item.id || item.streamUrl || item.name || '').trim();
          if (id) favoriteIdsSet.add(id);
          channelsList.push({
            id: id || `fav_${channelsList.length + 1}`,
            name: String(item.name || 'Canal Favorito'),
            streamUrl: String(item.streamUrl || ''),
            logoUrl: item.logoUrl ? String(item.logoUrl) : undefined,
            groupTitle: item.groupTitle ? String(item.groupTitle) : 'Favoritos',
            isFavorite: true,
          });
        }
      });
    }

    const totalFound = Math.max(favoriteIdsSet.size, channelsList.length);
    if (totalFound === 0) {
      return {
        success: false,
        totalFound: 0,
        favoriteIds: [],
        channels: [],
        error: 'Nenhum canal ou identificador de favorito válido foi encontrado no arquivo JSON.',
      };
    }

    return {
      success: true,
      totalFound,
      exportedAt,
      username,
      favoriteIds: Array.from(favoriteIdsSet),
      channels: channelsList,
    };
  } catch (err: any) {
    return {
      success: false,
      totalFound: 0,
      favoriteIds: [],
      channels: [],
      error: 'Formato de arquivo inválido. Certifique-se de selecionar um arquivo .json válido.',
    };
  }
}
