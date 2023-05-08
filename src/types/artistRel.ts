interface ArtistBaseInfo {
  id: number;
  name: string;
  picUrl: string;
}

interface ArtistInfo {
  videoCount: number;
  identify: Identify;
  artist: Artist;
  blacklist: boolean;
  preferShow: number;
  showPriMsg: boolean;
  secondaryExpertIdentiy: SecondaryExpertIdentiy[];
}

interface SecondaryExpertIdentiy {
  expertIdentiyId: number;
  expertIdentiyName: string;
  expertIdentiyCount: number;
}

interface Artist {
  id: number;
  cover: string;
  avatar: string;
  name: string;
  transNames: any[];
  alias: string[];
  identities: any[];
  identifyTag?: any;
  briefDesc: string;
  rank: Rank;
  albumSize: number;
  musicSize: number;
  mvSize: number;
}

interface Rank {
  rank: number;
  type: number;
}

interface Identify {
  imageUrl?: any;
  imageDesc: string;
  actionUrl: string;
}


export type { ArtistBaseInfo,ArtistInfo };


