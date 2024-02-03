import http from "@/utils/request";
import { usePlayer2Store } from "@/store/playerStore";
import pinia from "@/store/store";

const player2Store = usePlayer2Store(pinia)

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
  player2Store.playMulti(ids.join(','));
}