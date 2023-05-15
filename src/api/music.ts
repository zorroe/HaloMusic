import { MusicBaseInfo } from "@/types/musicRel";
import http from "@/utils/request";
import dayjs from "dayjs";

export const getLyricApi:any = (params: any) => {
  return http({
    url: "/lyric",
    params,
  });
};

export const likeMusicApi = (params: any) => {
  return http({
    url: "/like",
    params,
  });
};

export const getMusicUrlApi: any = (params: any) => {
  return http({
    url: "/song/url/v1",
    method: "get",
    params,
  });
};

export const getMusicUrl = async (musicId: string | number) => {
  const res = await getMusicUrlApi(musicId);
  if (res.code === 200) {
    const { data } = res;
    if (data[0].url === null) {
      return "";
    }
    return data[0].url;
  }
  return "";
};

export const getMusicDetailApi: any = async (musicId: string | number) => {
  return http({
    url: "/song/detail",
    method: "get",
    params: {
      ids: musicId,
    },
  });
};

export const getMusicDetail = async (musicId: string | number) => {
  const { songs } = await getMusicDetailApi(musicId);
  const song = songs[0]
  
  return {
    id: song.id,
    name: song.name,
    picUrl: song.al.picUrl,
    singers: song.ar.map((item: any) => {
      return { name: item.name, id: item.id };
    }),
    duration: dayjs(song.dt).format("mm:ss"),
    album: {
      id: song.al.id,
      name: song.al.name,
    },
  };
};

export const getRecommendSongsApi = async () => {
  return http({
    url: "/recommend/songs",
    method: "get",
  });
};

// 检查歌曲是否可用
export const checkMusicApi = async (id: number) => {
  return http({
    url: "/check/music",
    method: "get",
    params: {
      id,
    },
  });
};

// 获取歌曲资源
export const getAudioSourceFromNetease = async (id: number) => {
  const res = await getMusicUrlApi({ id, level: "exhigh" });
  const source = res.data[0].url.replace(/^http:/, "https:");
  return source;
};
