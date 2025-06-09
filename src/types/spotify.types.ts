// Spotify API Types
// See @project-rules.md for structure and naming conventions

export interface Image {
  url: string;
  height?: number;
  width?: number;
}

export interface Artist {
  id: string;
  name: string;
}

export interface Album {
  id: string;
  name: string;
  images: Image[];
  release_date: string;
}

export interface Track {
  id: string;
  name: string;
  artists: Artist[];
  album: Album;
  duration_ms: number;
  preview_url: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  images: Image[];
  tracks: {
    total: number;
    href: string;
  };
  owner: {
    id: string;
    display_name: string;
  };
}

// Represents a Spotify user profile
export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Image[];
} 