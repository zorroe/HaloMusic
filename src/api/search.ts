import http from '@/utils/request'
import pinia from '@/store/store'
import { useSearchStore } from '@/store'
import type {
  CloudSearchParams,
  CloudSearchResponse,
  SearchTypeEntry,
} from '@/types/searchRel'

const searchStore = useSearchStore(pinia)

export const cloudSearchApi = (
  params: CloudSearchParams
): Promise<CloudSearchResponse> =>
  http.get<CloudSearchResponse>('/cloudsearch', { params })

export const typeMap: SearchTypeEntry[] = [
  {
    code: '1',
    alias: 'song',
  },
  {
    code: '10',
    alias: 'album',
  },
  {
    code: '100',
    alias: 'artist',
  },
  {
    code: '1000',
    alias: 'playlist',
  },
  {
    code: '1002',
    alias: 'userprofile',
  },
  {
    code: '1004',
    alias: 'mv',
  },
]

/**
 * 按类型搜索并写入 store。
 * offset > 0 时由 store 追加（同 id 去重），保证分页“加载更多”语义不变。
 */
export const searchByType = async (
  typeC: string,
  offset: number
): Promise<void> => {
  const entry = typeMap.find((item) => item.alias === typeC)
  const params: CloudSearchParams = {
    keywords: searchStore.getSearchKey,
    type: entry?.code,
    limit: 10,
    offset,
  }
  const { result } = await cloudSearchApi(params)
  if (!result) return
  searchStore.setSearchResult(typeC, result)
}
