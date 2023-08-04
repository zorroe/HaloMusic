import http from "@/utils/request";
import { useSearchStore } from "@/store";
import pinia from "@/store/store";

const searchStore = useSearchStore(pinia);

export const cloudSearchApi = (params: any) => {
  return http({
    url: "/cloudsearch",
    method: "get",
    params,
  });
};

export const typeMap = [
  {
    code: "1",
    alias: "song",
  },
  {
    code: "10",
    alias: "album",
  },
  {
    code: "100",
    alias: "artist",
  },
  {
    code: "1000",
    alias: "playlist",
  },
  {
    code: "1002",
    alias: "userprofile",
  },
  {
    code: "1004",
    alias: "mv",
  },
];

export const searchByType = async (typeC: string, offset: number) => {
  const m = typeMap.find((x) => {
    return x.alias == typeC;
  });
  const params = {
    keywords: searchStore.getSearchKey,
    type: m?.code,
    limit: 10,
    offset,
  };
  const { result } = (await cloudSearchApi(params)) as any;
  searchStore.setSearchResult(typeC, result);
};
