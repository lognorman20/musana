import { Playlist } from './spotify.types';

export interface PlaylistItemProps {
  item: Playlist;
  onPress?: (playlist: Playlist) => void;
}

export interface PlaylistSectionProps {
  playlists: Playlist[];
  loading: boolean;
  error: string | null;
  onLoadPlaylists: () => Promise<void>;
} 