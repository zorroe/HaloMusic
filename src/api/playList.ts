import http from "@/utils/request";

export const getRecommandPlayListApi: any = (params: any = { limit: 10 }) => {
  return http({
    url: "/personalized",
    method: "get",
    params,
  });
};

export const getTopListApi: any = () => {
  return http({
    url: "/toplist",
    method: "get",
  });
};

// 获取歌单所有歌曲
export const getPlayListAllApi: any = (params: any) => {
  return http({
    url: "/playlist/track/all",
    method: "get",
    params,
  });
};

// 获取歌单详情
export const getPlayListDetailApi = (params: any) => {
  return http({
    url: "/playlist/detail",
    method: "get",
    params,
  });
};

// 收藏与取消收藏
export const subscribePlayListApi = (params: any) => {
  return http({
    url: "/playlist/subscribe",
    method: "get",
    params,
  });
};

// 删除歌单
export const deletePlayListApi = (params: any) => {
  return http({
    url: "/playlist/delete",
    method: "get",
    params,
  });
};
