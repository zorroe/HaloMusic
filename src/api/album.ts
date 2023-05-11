import http from "@/utils/request";
import { usePlayerStore } from "@/store";
import pinia from "@/store/store";

const playerStore = usePlayerStore(pinia);

export const getNewAlbumApi: any = () => {
  return http({
    url: "/album/newest",
    method: "get",
    params: { limit: 10 },
  });
};


export const getAlbumApi:any = (params:any)=>{
  return http({
    url:"/album",
    method:"get",
    params
  })
}

export const getSubAlbumlistApi:any = (params:any)=>{
  return http({
    url: "/album/sublist",
    method: "get",
    params
  })
}

export const playAllByAlbumId = async(id:number) => {
  const {songs} = await getAlbumApi({id})
  const ids = songs.map((item:any)=>item.id)
  playerStore.playMulti(ids);
}