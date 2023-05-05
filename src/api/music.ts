import http from "@/utils/request";

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
  const res = await getMusicDetailApi(musicId);
  const { songs } = res;
  return songs[0];
};