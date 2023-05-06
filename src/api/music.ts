import { MusicBaseInfo } from "@/types/musicRel";
import http from "@/utils/request";
import dayjs from "dayjs";

export const getLyricApi = (params: any) => {
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

const getMusicUrlApi: any = (musicId: string | number) => {
  return http({
    url: "/song/url/v1",
    method: "get",
    params: {
      id: musicId,
      level: "exhigh",
    },
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
  return {
    id: songs[0].id,
    name: songs[0].name,
    picUrl: songs[0].al.picUrl,
    singers: songs[0].ar.map((item: any) => {
      return { name: item.name, id: item.id };
    }),
    duration: dayjs(songs[0].dt).format("mm:ss"),
    album: {
      id: songs[0].al.id,
      name: songs[0].al.name,
    },
  };
};

export const getRecommendSongsApi = async () => {
  return http({
    url: "/recommend/songs",
    method: "get",
  });
};
