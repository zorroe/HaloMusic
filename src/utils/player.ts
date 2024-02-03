import {
  checkMusicApi,
  getMusicUrlApi,
  getMusicDetailApi,
  personFmApi,
} from '@/api/music'

type SongLevel =
  | 'standard'
  | 'higher'
  | 'exhigh'
  | 'lossless'
  | 'hires'
  | 'jyeffect'
  | 'sky'
  | 'jymaster'

/**
 * 判断歌曲是否可用
 * @param songId 歌曲id
 * @returns 歌曲是否可用 true/false
 */
export const canPlay = async (songId: number) => {
  const { success } = await checkMusicApi(songId)
  return success
}

/**
 *
 * @param songId 歌曲id
 * @param level 歌曲质量
 * @returns 歌曲资源url
 */
export const getSongResource = async (songId: number, level: SongLevel) => {
  const params = {
    id: songId,
    level,
  }
  const { data } = await getMusicUrlApi(params)
  return data.length > 0 ? data[0] : false
}

/**
 * 查询单个歌曲的时候
 * @param ids 歌曲id，可以是单首歌曲的id，也可以是歌曲id列表
 * @returns 歌曲信息
 */
export const getMusicDetail = async (ids: string) => {
  const params = {
    ids,
  }
  const { songs } = await getMusicDetailApi(params)
  return songs.length > 0 ? songs : false
}

/**
 *
 * @returns 私人FM返回的信息
 */
export const getPersonfm = async () => {
  const { data } = await personFmApi()
  return data[0]
}
