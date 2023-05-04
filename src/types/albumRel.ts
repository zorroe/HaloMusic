import { ArtistBaseInfo } from "./artistRel";

interface AlbumBaseInfo {
  id: number;
  name: string;
  picUrl: string;
  artists: ArtistBaseInfo[];
}

export type { AlbumBaseInfo };
