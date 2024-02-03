import http from "@/utils/request";
import { usePlayer2Store } from "@/store/playerStore";
import pinia from "@/store/store";

const playerStore = usePlayer2Store(pinia);

export const getrecommendArtistApi: any = (params: { type: 1 | 2 | 3 | 4 }) => {
  return http({
    url: "/toplist/artist",
    method: "get",
    params,
  });
};

export const getArtistDetailApi: any = (params: any) => {
  return http({
    url: "/artist/detail",
    method: "get",
    params,
  });
};

export const getSongsByArtistIdApi: any = (params: any) => {
  return http({
    url: "/artist/songs",
    method: "get",
    params,
  });
};

export const getArtistAlbumApi: any = (params: any) => {
  return http({
    url: "/artist/album",
    method: "get",
    params,
  });
};

export const getArtistMvApi: any = (params: any) => {
  return http({
    url: "/artist/mv",
    method: "get",
    params,
  });
};

export const playAllByArtistId = async (id: number) => {
  const params = {
    id,
    limit: 1000,
    offset: 0,
  };
  const { songs } = await getSongsByArtistIdApi(params);
  const ids = songs.map((item: any) => item.id);
  playerStore.playMulti(ids);
};

export const subArtistApi = async (id: string, t: 1 | 2) => {
  const params = {
    id,
    t,
  };
  return http({
    url: "/artist/sub",
    method: "get",
    params,
  });
}



export const playMusicByArtistId = async (id:string) => {
  const { songs: s1s } = await getSongsByArtistIdApi({
    id,
    limit: 999,
  });
  const ids = s1s.map((song: any) => song.id);
  playerStore.playMulti(ids.join(','));
};