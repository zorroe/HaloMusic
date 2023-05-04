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
