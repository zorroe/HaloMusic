import http from "@/utils/request";

export const getLikeListApi = (params: any) => {
  return http.get("/likeList", { params });
};

export const getPlayListByUidApi = (params: any) => {
  return http.get("/user/playlist", { params });
};

export const getListenHistoryApi:any = (params: any) => {
  return http({
    url: "/user/record",
    method: "get",
    params,
  });
};
