/**
 * 视图层数据映射工具。
 *
 * 网易云接口返回的原始结构字段命名不统一（如 `picUrl` / `coverImgUrl`、
 * `ar` / `artists`、`dt` / `duration`），各页面重复手写映射逻辑既啰嗦又容易
 * 漏字段。这里集中做一次归一化，视图只负责渲染项目内部类型。
 */
import { formatTrackTime } from '@/utils/common'
import type { MusicBaseInfo } from '@/types/musicRel'
import type { PlayListBaseInfo } from '@/types/playListRel'
import type { ArtistBaseInfo } from '@/types/artistRel'
import type { AlbumBaseInfo } from '@/types/albumRel'
import type { MvBaseInfo } from '@/types/mvRel'

/** 接口返回的歌手精简结构 */
export interface RawArtist {
  id: number
  name: string
  picUrl?: string
  img1v1Url?: string
}

/** 接口返回的专辑精简结构 */
export interface RawAlbum {
  id: number
  name: string
  picUrl?: string
  artists?: RawArtist[]
}

/** 接口返回的歌曲结构（song/detail、artist/songs、playlist/track/all 等通用） */
export interface RawSong {
  id: number
  name: string
  /** 毫秒时长 */
  dt?: number
  /** 部分接口用 duration */
  duration?: number
  al?: RawAlbum
  album?: RawAlbum
  ar?: RawArtist[]
  artists?: RawArtist[]
  picUrl?: string
}

/** 接口返回的歌单精简结构 */
export interface RawPlayList {
  id: number
  name: string
  picUrl?: string
  coverImgUrl?: string
  playCount?: number
  playcount?: number
  creator?: {
    id?: number
    userId?: number
    nickname?: string
  } | null
}

/** 接口返回的 MV 精简结构 */
export interface RawMv {
  id: number
  name: string
  cover?: string
  imgurl16v9?: string
  picUrl?: string
  artists?: RawArtist[]
  creator?: RawArtist[]
}

/**
 * 把图片地址统一为 https。
 *
 * 应用通过 file:// / http://127.0.0.1 加载，主进程注入的 CSP 只放行 https: 图片；
 * 网易云接口返回的封面大多是 http://，直接使用会被拦截成裂图。
 */
export const normalizeImageUrl = (url?: string | null): string => {
  if (!url) return ''
  const trimmed = url.trim()
  if (trimmed.startsWith('http://')) return `https://${trimmed.slice(7)}`
  return trimmed
}

/** 毫秒 → `m:ss`，无效值返回空串 */
export const formatDurationMs = (ms?: number | null): string => {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return ''
  return formatTrackTime(Math.round(ms / 1000))
}

/** 原始歌曲 → 项目内部 MusicBaseInfo */
export const mapSong = (song: RawSong): MusicBaseInfo => {
  const album = song.al ?? song.album
  const artists = song.ar ?? song.artists ?? []
  return {
    id: song.id,
    name: song.name,
    picUrl: normalizeImageUrl(song.picUrl ?? album?.picUrl),
    singers: artists.map(artist => ({ id: artist.id, name: artist.name })),
    duration: formatDurationMs(song.dt ?? song.duration),
    album: album ? { id: album.id, name: album.name } : undefined,
  }
}

/** 原始歌单 → 项目内部 PlayListBaseInfo */
export const mapPlayList = (item: RawPlayList): PlayListBaseInfo => ({
  id: item.id,
  name: item.name,
  picUrl: normalizeImageUrl(item.coverImgUrl ?? item.picUrl),
  playCount: item.playCount ?? item.playcount ?? 0,
  creator: item.creator
    ? {
        id: item.creator.userId ?? item.creator.id ?? 0,
        nickname: item.creator.nickname ?? '',
      }
    : undefined,
})

/** 原始歌手 → 项目内部 ArtistBaseInfo */
export const mapArtist = (item: RawArtist): ArtistBaseInfo => ({
  id: item.id,
  name: item.name,
  picUrl: normalizeImageUrl(item.picUrl ?? item.img1v1Url),
})

/** 原始专辑 → 项目内部 AlbumBaseInfo */
export const mapAlbum = (item: RawAlbum): AlbumBaseInfo => ({
  id: item.id,
  name: item.name,
  picUrl: normalizeImageUrl(item.picUrl),
  artists: (item.artists ?? []).map(artist => ({
    id: artist.id,
    name: artist.name,
    picUrl: normalizeImageUrl(artist.picUrl ?? artist.img1v1Url),
  })),
})

/** 原始 MV → 项目内部 MvBaseInfo */
export const mapMv = (item: RawMv): MvBaseInfo => {
  const creators = (item.artists ?? item.creator ?? []).map(artist => ({
    id: artist.id,
    name: artist.name,
  }))
  return {
    id: item.id,
    name: item.name,
    picUrl: normalizeImageUrl(item.picUrl ?? item.cover ?? item.imgurl16v9),
    // MvBaseInfo.creators 目前声明为单元素元组，运行时允许为空数组
    creators: creators as MvBaseInfo['creators'],
  }
}

/** 洗牌（不修改入参） */
export const shuffle = <T>(list: readonly T[]): T[] => {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** 随机取前 count 个（不修改入参） */
export const randomSlice = <T>(list: readonly T[], count: number): T[] =>
  shuffle(list).slice(0, Math.max(0, count))
