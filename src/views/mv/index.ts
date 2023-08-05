import http from "@/utils/request";

export const mvDetailApi = (params: any) => {
  return http({
    url: "/mv/detail",
    method: "get",
    params,
  });
};

export const mvUrlApi = (params: any) => {
  return http({
    url: "/mv/url",
    method: "get",
    params,
  });
};

interface MvData {
  id: number;
  name: string;
  artistId: number;
  artistName: string;
  briefDesc: string;
  desc?: any;
  cover: string;
  coverId_str: string;
  coverId: CoverId;
  playCount: number;
  subCount: number;
  shareCount: number;
  commentCount: number;
  duration: number;
  nType: number;
  publishTime: string;
  price?: any;
  brs: Br[];
  artists: Artist[];
  commentThreadId: string;
  videoGroup: any[];
}

interface Artist {
  id: number;
  name: string;
  img1v1Url: string;
  followed: boolean;
}

interface Br {
  size: number;
  br: number;
  point: number;
}

interface CoverId {
  s: number;
  e: number;
  c: number[];
}

export type { MvData };
