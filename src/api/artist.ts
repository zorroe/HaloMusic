import http from "@/utils/request";

export const getrecommendArtistApi: any = (params: { type: 1 | 2 | 3 | 4 }) => {
  return http({
    url: "/toplist/artist",
    method: "get",
    params,
  });
};
