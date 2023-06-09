import http from "@/utils/request";
import { usePlayerStore } from "@/store";
import pinia from "@/store/store";
import { GrinningFaceWithSquintingEyes } from "@icon-park/vue-next";

const playerStore = usePlayerStore(pinia);

export const getrecommendPlayListApi: any = (params: any = { limit: 10 }) => {
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

// 歌单标签列表
export const playListTagsApi = ()=>{
  return http({
    url: "/playlist/highquality/tags",
    method: "get",
  });
}

export const topPlayListApi = (params:any)=>{
  return http({
    url: "/top/playlist",
    method: "get",
    params,
  })
}

export const getHighQualityPlayListApi = (params:any)=>{
  return http({
    url: "/top/playlist/highquality",
    method: "get",
    params,
  })
}

// 根据歌单id播放歌单的所有歌曲
export const playAllByPlayListId = async (id: number | string) => {
  const { songs } = await getPlayListAllApi({ id });
  const ids = songs.map((item: any) => item.id);
  playerStore.playMulti(ids);
};


// 获取精品歌单
export const getHighQualityPlayList:any = async (params:any)=>{
  const res = await getHighQualityPlayListApi(params)
  return res
}

export const getTopPlayList:any = async (params:any)=>{
  const res = await topPlayListApi(params)
  return res
}