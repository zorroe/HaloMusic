interface MusicBaseInfo {
  id: number;
  name: string;
  picUrl: string;
  singers: {
    id: number;
    name: string;
  }[];
  duration: string;
  album: {
    id: number;
    name: string;
  };
}

export type { MusicBaseInfo };
