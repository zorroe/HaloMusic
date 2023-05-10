import http from "@/utils/request";

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