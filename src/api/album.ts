import http from "@/utils/request";

export const getNewAlbumApi: any = () => {
  return http({
    url: "/album/newest",
    method: "get",
    params: { limit: 10 },
  });
};
