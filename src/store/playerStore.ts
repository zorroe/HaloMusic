/**
 * 播放器核心 store（audio 事件驱动）
 *
 * 设计要点：
 * - audio 是闭包内单例，所有状态（currentTime / duration / paused）由 audio 事件驱动，
 *   不再使用任何 setInterval 伪造进度。
 * - initPlayer 幂等：重复调用不会重复绑定监听。
 * - 队列模型：playlist = 完整歌曲详情数组，songId = 当前歌曲 id，
 *   current = 根据 songId 在队列中的位置计算；cycleMode 0 单曲 / 1 列表 / 2 随机。
 * - 随机模式维护 shufflePool（一轮内不重复），播完一轮才重新洗牌，避免连续重复。
 * - 播放失败（版权/无资源/音源失效/网络错误）自动跳下一首，但连续失败有上限，
 *   避免不可用歌单把整张列表的接口刷爆。
 * - 持久化 key 保持 player-* 前缀，升级后老用户播放列表/音量/音质等数据不丢。
 */
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { debounceFilter, useLocalStorage } from '@vueuse/core'
import notify from '@/components/common/notification/notify'
import { getLyricApi } from '@/api/music'
import { withoutAbortOnNavigate } from '@/utils/request'
import {
  canPlay,
  getMusicDetail,
  getPersonfm,
  getSongResource,
  type SongDetail,
  type SongId,
  type SongLevel,
  type SongResource,
} from '@/utils/player'
import {
  migrateLegacyQueue,
  normalizeQueueId,
  readLegacyCurrentId,
  readLegacyPlaylist,
  readPersistedQueue,
  removeLegacyPlaylist,
  serializeQueue,
  writePersistedQueue,
  type PersistedQueue,
} from '@/utils/queue-storage'
import { findActiveLyricIndex, parseLrc, type LyricLine } from '@/utils/lyric'

/** 启动回填详情时每次 /song/detail 请求的最大歌曲数（避免 URL 过长） */
const DETAIL_FETCH_CHUNK_SIZE = 500

/** 连续播放失败达到该次数后停止自动跳过，防止不可用歌单死循环 */
const MAX_CONSECUTIVE_FAILURES = 5

/**
 * currentTime 写 store 的节流间隔。
 * rAF 仍然每帧读取 audio.currentTime（播放状态由 audio 自身维护），
 * 但只有距上次写 store 超过 100ms 才真正赋值，把跨组件响应式刷新
 * 从 60Hz 降到 10Hz；play/pause/seek/ended/切歌等离散事件仍然立即同步。
 */
const PROGRESS_EMIT_INTERVAL_MS = 100

/** 支持的音质档位（与 setQuality 白名单一致） */
const QUALITY_OPTIONS: SongLevel[] = [
  'standard',
  'higher',
  'exhigh',
  'lossless',
]

const DEFAULT_QUALITY: SongLevel = 'exhigh'

/** id 统一转字符串比较：历史数据里 id 可能是 number 也可能是 string */
const toKey = (id: SongId | null | undefined): string =>
  id === null || id === undefined ? '' : String(id)

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isAbortError = (error: unknown): boolean =>
  isObject(error) && error.name === 'AbortError'

const isNotAllowedError = (error: unknown): boolean =>
  isObject(error) && error.name === 'NotAllowedError'

/** Fisher-Yates 洗牌（返回新数组，不改入参） */
const shuffleKeys = (keys: string[]): string[] => {
  const result = keys.slice()
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const clampPercent = (value: number): number => {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.min(100, Math.max(0, Math.round(num)))
}

export const usePlayerStore = defineStore('player', () => {
  // ---------------- audio 单例 ----------------
  const audio = new Audio()
  audio.preload = 'auto'

  // ---------------- 持久化状态（key 与旧版本保持一致） ----------------
  const songId = useLocalStorage<SongId>('player-id', '')
  const cycleMode = useLocalStorage<number>('player-cycleMode', 1) // 0 单曲 1 列表 2 随机
  const isFm = useLocalStorage<boolean>('player-isfm', false)
  const volume = useLocalStorage<number>('player-volume', 60, {
    eventFilter: debounceFilter(1000),
  })
  const currentTime = useLocalStorage<number>('player-current-time', 0, {
    // 进度每帧变化，持久化做 1s 防抖，避免每帧同步写 localStorage
    eventFilter: debounceFilter(1000),
  })
  const lyricStr = useLocalStorage<string>('player-lyricStr', '')
  const quality = useLocalStorage<SongLevel>('player-quality', DEFAULT_QUALITY)

  // 播放队列只持久化 id 列表（player-queue-v2），完整歌曲对象仅存在内存与旧版迁移里
  const playlist = ref<SongDetail[]>([])

  // ---------------- 非持久化状态 ----------------
  const showPlayerPage = ref(false)
  const paused = ref(true)
  const mediaDuration = ref(0)
  const loading = ref(false)

  // ---------------- 内部可变状态（闭包内，不参与响应式） ----------------
  /** 每次开始播放自增，异步链路回来时用于丢弃过期结果 */
  let playToken = 0
  /** 连续失败计数 */
  let consecutiveFailures = 0
  /** 当前音源是否已经处理过 error 事件（同一次加载只跳过一次） */
  let errorHandled = false
  /** 拖动进度条期间冻结 timeupdate，避免进度回跳 */
  let seeking = false
  let seekTimer: ReturnType<typeof setTimeout> | undefined
  let progressFrame = 0
  let listenersBound = false
  /** 随机模式本轮待播池（存 id 字符串） */
  let shufflePool: string[] = []
  /** 静音前的音量，用于 toggleMute 恢复 */
  let lastNonZeroVolume = clampPercent(volume.value) || 60
  /** 上次把进度写入 store 的时间戳（performance.now），用于 10Hz 节流 */
  let lastProgressEmitAt = 0
  /** v2 队列是否已完成一次回填（成功、无数据或确认失败），保证 hydrate 幂等 */
  let queueHydrated = false
  let queueHydratePromise: Promise<void> | null = null
  /** 回填失败（离线/接口异常）时暂存的持久化队列，供用户点歌前重试一次 */
  let pendingHydratedQueue: PersistedQueue | null = null
  /** pending 队列是否已经重试过，避免每次点歌都触发网络请求 */
  let hydrationRetried = false

  const nowMs = (): number =>
    typeof performance !== 'undefined' ? performance.now() : Date.now()

  // ---------------- 数据清洗（兼容旧版本持久化的脏数据） ----------------
  if (!QUALITY_OPTIONS.includes(quality.value)) quality.value = DEFAULT_QUALITY
  if (![0, 1, 2].includes(Number(cycleMode.value))) cycleMode.value = 1
  volume.value = clampPercent(volume.value)
  // 上次会话的进度没有对应音源，启动时归零（key 继续保留，兼容旧版本）
  currentTime.value = 0
  audio.volume = clampPercent(volume.value) / 100

  // ---------------- 队列持久化（v2：ids + currentId，体量远小于完整对象） ----------------
  /** 把内存队列 + 当前歌曲 id 写入 v2 存储；失败时 queue-storage 内部静默降级 */
  const persistQueue = (): void => {
    writePersistedQueue(serializeQueue(playlist.value, songId.value))
  }

  // 当前曲变化（切歌/暂停恢复/停止/清空）都要同步持久化的 currentId
  watch(songId, () => {
    persistQueue()
  })

  // ---------------- 计算属性 ----------------
  const playlistCount = computed(() =>
    Array.isArray(playlist.value) ? playlist.value.length : 0
  )

  const current = computed<{ currentSong: SongDetail | null; idx: number }>(
    () => {
      const list = Array.isArray(playlist.value) ? playlist.value : []
      const key = toKey(songId.value)
      const idx = key ? list.findIndex((song) => toKey(song?.id) === key) : -1
      return {
        currentSong: idx === -1 ? null : list[idx],
        idx,
      }
    }
  )

  const duration = computed(() => {
    const media = mediaDuration.value
    if (Number.isFinite(media) && media > 0) return media
    const dt = current.value.currentSong?.dt
    return typeof dt === 'number' && Number.isFinite(dt) && dt > 0
      ? dt / 1000
      : 0
  })

  const lyrics = computed<LyricLine[]>(() =>
    parseLrc(typeof lyricStr.value === 'string' ? lyricStr.value : '')
  )

  const activeLyricIndex = computed(() =>
    findActiveLyricIndex(lyrics.value, currentTime.value)
  )

  // ---------------- audio 事件处理 ----------------
  const stopProgressLoop = () => {
    if (progressFrame) {
      cancelAnimationFrame(progressFrame)
      progressFrame = 0
    }
  }

  /**
   * timeupdate / rAF 的统一同步入口。
   * - 播放中由 rAF 每帧触发，但写 store 节流到 10Hz（100ms），避免 60fps 跨组件刷新；
   * - force=true 用于 play/pause/seek/ended/切歌等离散事件，保证立即同步；
   * - 拖动进度条期间不覆盖用户输入。
   */
  const syncCurrentTime = (force = false) => {
    if (seeking) return
    const time = audio.currentTime
    if (!Number.isFinite(time)) return
    const now = nowMs()
    if (!force && now - lastProgressEmitAt < PROGRESS_EMIT_INTERVAL_MS) return
    lastProgressEmitAt = now
    currentTime.value = time
  }

  const syncDuration = () => {
    const total = audio.duration
    if (Number.isFinite(total) && total > 0) mediaDuration.value = total
  }

  const startProgressLoop = () => {
    stopProgressLoop()
    const tick = () => {
      // 每帧读取 audio 状态，但 syncCurrentTime 内部按 100ms 节流写 store
      syncCurrentTime()
      if (!audio.paused && !audio.ended) {
        progressFrame = requestAnimationFrame(tick)
      } else {
        progressFrame = 0
      }
    }
    progressFrame = requestAnimationFrame(tick)
  }

  const onPlay = () => {
    paused.value = false
    syncCurrentTime(true)
    startProgressLoop()
  }

  const onPlaying = () => {
    paused.value = false
    consecutiveFailures = 0
    syncCurrentTime(true)
    startProgressLoop()
  }

  const onPause = () => {
    paused.value = true
    stopProgressLoop()
    // 暂停是离散事件：立即把最终进度同步到 store
    syncCurrentTime(true)
  }

  const onSeeked = () => {
    seeking = false
    if (seekTimer) {
      clearTimeout(seekTimer)
      seekTimer = undefined
    }
    syncCurrentTime(true)
  }

  const onTimeUpdate = () => {
    syncCurrentTime()
  }

  const onVisibilityChange = () => {
    if (typeof document === 'undefined') return
    if (document.visibilityState === 'visible') {
      // 窗口重新可见时立即补一次进度，然后交给 rAF 的 10Hz 节流
      syncCurrentTime(true)
      if (!audio.paused) startProgressLoop()
    } else {
      stopProgressLoop()
    }
  }

  const onAudioError = () => {
    if (!songId.value) return
    if (errorHandled) return
    errorHandled = true
    const code = audio.error?.code
    let reason = '音频播放失败'
    if (code === 2) reason = '网络错误导致播放中断'
    else if (code === 3) reason = '音频解码失败'
    else if (code === 4) reason = '音源失效或格式不支持'
    void handleConsecutiveFailure(reason)
  }

  // ---------------- 队列工具 ----------------
  const resetShufflePool = () => {
    shufflePool = []
  }

  /** 把歌曲插入队列：已存在则复用，不存在插到当前歌曲之后（空队列追加到末尾） */
  const insertSong = (song: SongDetail): SongDetail => {
    if (!song || toKey(song.id) === '') return song
    const list = Array.isArray(playlist.value) ? playlist.value : []
    const existed = list.find(
      (songItem) => toKey(songItem?.id) === toKey(song.id)
    )
    if (existed) return existed

    const insertAt = current.value.idx + 1
    const nextList = list.slice()
    nextList.splice(Math.max(0, insertAt), 0, song)
    playlist.value = nextList
    persistQueue()
    resetShufflePool()
    return song
  }

  const listEdgeIndex = (direction: 1 | -1): number => {
    const length = playlist.value.length
    if (length === 0) return -1
    const currentIdx = current.value.idx
    if (currentIdx === -1) return direction === 1 ? 0 : length - 1
    return (currentIdx + direction + length) % length
  }

  /** 随机模式取下一首：一轮内不重复，池空后重洗并排除当前曲 */
  const randomIndex = (): number => {
    const list = playlist.value
    if (list.length === 0) return -1
    if (list.length === 1) return 0

    const currentKey = toKey(current.value.currentSong?.id)
    const validKeys = list.map((song) => toKey(song.id))
    const validKeySet = new Set(validKeys)

    shufflePool = shufflePool.filter(
      (key) => validKeySet.has(key) && key !== currentKey
    )
    if (shufflePool.length === 0) {
      shufflePool = shuffleKeys(validKeys.filter((key) => key !== currentKey))
    }

    const nextKey = shufflePool.shift()
    if (!nextKey) {
      return validKeys.findIndex((key) => key !== currentKey)
    }
    return validKeys.indexOf(nextKey)
  }

  // ---------------- 启动队列回填（v2 优先，旧版 player-playlist 自动迁移） ----------------
  /** 旧版完整对象数组里字段齐全、可直接复用（不请求网络）的歌曲，按 ids 顺序返回 */
  const collectReusableSongs = (
    legacySongs: readonly unknown[],
    ids: number[]
  ): SongDetail[] => {
    const idSet = new Set(ids.map((id) => String(id)))
    const reusable = new Map<string, SongDetail>()
    for (const raw of legacySongs) {
      if (!isObject(raw)) continue
      const id = normalizeQueueId(raw.id)
      if (id === null || !idSet.has(String(id))) continue
      if (typeof raw.name !== 'string' || raw.name.length === 0) continue
      reusable.set(String(id), raw as unknown as SongDetail)
    }
    return ids
      .map((id) => reusable.get(String(id)))
      .filter((song): song is SongDetail => Boolean(song))
  }

  /**
   * 按保存顺序批量回填歌曲详情；失败（离线/接口异常）返回 null。
   * 大歌单（最多 2000 首）一次性拼接 ids 会超出 URL 长度限制，按块请求更稳。
   */
  const fetchSongsByIds = async (
    ids: number[]
  ): Promise<SongDetail[] | null> => {
    if (ids.length === 0) return []

    const fetched: SongDetail[] = []
    for (let start = 0; start < ids.length; start += DETAIL_FETCH_CHUNK_SIZE) {
      const chunkIds = ids.slice(start, start + DETAIL_FETCH_CHUNK_SIZE)
      const chunkSongs = await getMusicDetail(chunkIds.join(','))
      if (chunkSongs && chunkSongs.length > 0) fetched.push(...chunkSongs)
    }
    if (fetched.length === 0) return null

    // 详情接口返回顺序不保证与入参一致，必须按保存的 ids 重排
    const songMap = new Map(fetched.map((song) => [toKey(song.id), song]))
    const ordered: SongDetail[] = []
    for (const id of ids) {
      const song = songMap.get(String(id))
      if (song) ordered.push(song)
    }
    return ordered.length > 0 ? ordered : null
  }

  /**
   * 把回填结果恢复成内存队列。
   * 不自动播放：audio 不动，paused 保持 true，只恢复 current/currentSong。
   */
  const applyHydratedSongs = (
    songs: SongDetail[],
    currentId: number | null
  ): void => {
    // 用户已经开始操作（例如启动后先点了歌）时，不要覆盖当前队列
    if (playlist.value.length > 0 || songs.length === 0) return

    playlist.value = songs
    resetShufflePool()

    const wantedKey =
      currentId !== null ? String(currentId) : toKey(songId.value)
    const matched = wantedKey
      ? songs.find((song) => toKey(song.id) === wantedKey)
      : undefined
    if (matched) songId.value = matched.id

    // 回填后把（可能被接口丢弃部分歌曲的）最新队列写回 v2
    persistQueue()
  }

  /** 用 v2 数据回填；失败时把 ids 暂存 pending，供用户点歌前重试一次 */
  const restoreFromPersistedQueue = async (
    persisted: PersistedQueue
  ): Promise<void> => {
    const songs = await fetchSongsByIds(persisted.ids)
    if (!songs) {
      // 离线/接口失败：ids 已保存在 v2，本次会话队列暂空
      pendingHydratedQueue = persisted
      return
    }
    pendingHydratedQueue = null
    applyHydratedSongs(songs, persisted.currentId)
  }

  /** 真正执行一次回填：优先 v2；没有 v2 时迁移旧版完整队列 */
  const doHydrateQueue = async (): Promise<void> => {
    // 内存里已有队列（用户在 hydrate 完成前就点了歌/播放）——以内存为准
    if (playlist.value.length > 0) {
      if (readPersistedQueue()) removeLegacyPlaylist()
      return
    }

    const persisted = readPersistedQueue()
    if (persisted) {
      // v2 存在即权威数据，旧版完整队列 key 可安全清理
      removeLegacyPlaylist()
      if (persisted.ids.length === 0) return
      await restoreFromPersistedQueue(persisted)
      return
    }

    // 没有 v2：尝试从旧版 player-playlist（完整对象数组）迁移
    const legacySongs = readLegacyPlaylist()
    if (!legacySongs || legacySongs.length === 0) {
      if (legacySongs) removeLegacyPlaylist()
      return
    }

    const migrated = migrateLegacyQueue(legacySongs, readLegacyCurrentId())
    if (!migrated) {
      // 旧数据全是脏 id，没有迁移价值，清掉避免每次启动重复解析
      removeLegacyPlaylist()
      return
    }

    // 旧对象数组字段齐全时直接复用内存数据，不请求网络
    const reusableSongs = collectReusableSongs(legacySongs, migrated.ids)
    if (reusableSongs.length === migrated.ids.length) {
      writePersistedQueue(migrated)
      applyHydratedSongs(reusableSongs, migrated.currentId)
      removeLegacyPlaylist()
      return
    }

    // 字段不全：先把 ids 落到 v2（离线也不丢），再按 ids 批量回填详情
    writePersistedQueue(migrated)
    removeLegacyPlaylist()
    await restoreFromPersistedQueue(migrated)
  }

  /**
   * 启动回填入口：异步、幂等、不阻塞首帧。
   * 重复调用只会复用同一个 Promise；成功/失败都会置 hydrated 标记，不会重复请求。
   */
  const hydrateQueue = (): Promise<void> => {
    if (queueHydrated) return Promise.resolve()
    if (queueHydratePromise) return queueHydratePromise
    queueHydratePromise = (async () => {
      try {
        await doHydrateQueue()
      } catch {
        // 回填失败不阻塞播放；pending 队列留待用户点歌前重试
      } finally {
        queueHydrated = true
        queueHydratePromise = null
      }
    })()
    return queueHydratePromise
  }

  /** 回填失败后的唯一一次重试（非阻塞，不拖慢用户的点歌操作） */
  const retryPendingHydration = (): void => {
    if (!pendingHydratedQueue || hydrationRetried) return
    if (playlist.value.length > 0) return
    hydrationRetried = true
    void restoreFromPersistedQueue(pendingHydratedQueue)
  }

  // ---------------- 播放核心 ----------------
  const safePlay = async () => {
    try {
      await audio.play()
    } catch (error) {
      if (isAbortError(error)) return
      notify({ message: '播放失败，请点击播放按钮重试', type: 'warning' })
    }
  }

  /** 停止播放并清空"当前曲"相关状态（不清队列） */
  const stopPlayback = () => {
    playToken += 1
    errorHandled = true
    consecutiveFailures = 0
    seeking = false
    if (seekTimer) {
      clearTimeout(seekTimer)
      seekTimer = undefined
    }
    stopProgressLoop()
    songId.value = ''
    currentTime.value = 0
    lastProgressEmitAt = 0
    mediaDuration.value = 0
    lyricStr.value = ''
    isFm.value = false
    paused.value = true
    loading.value = false
    resetShufflePool()
    try {
      audio.pause()
    } catch {
      /* audio 未加载音源时 pause 可能抛错，忽略 */
    }
    audio.removeAttribute('src')
  }

  const replayCurrent = async () => {
    if (!audio.src) {
      const idx = current.value.idx
      if (idx !== -1) await playByIndex(idx)
      return
    }
    currentTime.value = 0
    try {
      audio.currentTime = 0
    } catch {
      /* 未加载音源时忽略 */
    }
    await safePlay()
  }

  /** 取歌词文本；失败/无歌词返回空串（调用方只在 token 未过期时采用） */
  const fetchLyricStr = async (id: SongId): Promise<string> => {
    try {
      // 歌词属于当前播放歌曲，不能因为用户切页被导航作用域取消
      const res: unknown = await withoutAbortOnNavigate(() =>
        getLyricApi({ id: Number(id) })
      )
      if (!isObject(res) || !isObject(res.lrc)) return ''
      const lyric = res.lrc.lyric
      return typeof lyric === 'string' ? lyric : ''
    } catch {
      return ''
    }
  }

  /** 连续失败处理：达到上限停止并提示，否则自动跳下一首 */
  const handleConsecutiveFailure = async (reason: string) => {
    consecutiveFailures += 1
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      consecutiveFailures = 0
      stopPlayback()
      notify({
        message:
          '连续多首歌曲无法播放，已停止自动跳过，请检查网络或歌曲版权状态',
        type: 'error',
      })
      return
    }
    notify({ message: `${reason}，已自动跳到下一首`, type: 'warning' })
    await advance(1, 'failure')
  }

  /** 播放指定歌曲对象（内部核心：版权检查 -> 取流 -> play -> 歌词并行） */
  const startSong = async (
    song: SongDetail,
    preloadedResource?: SongResource
  ): Promise<boolean> => {
    if (!song || toKey(song.id) === '') return false

    const token = (playToken += 1)
    loading.value = true
    errorHandled = false
    mediaDuration.value = 0
    currentTime.value = 0
    // 切歌是离散事件：清掉节流时间戳，让新曲第一次 rAF 就立即同步进度
    lastProgressEmitAt = 0
    lyricStr.value = ''
    songId.value = song.id

    // 歌词与音源并行获取，避免"先 play 再 await 歌词再 seek"的顺序问题
    const lyricPromise = fetchLyricStr(song.id)

    try {
      let resource: SongResource | null

      if (preloadedResource) {
        // 调用方（如 setQuality）已经取过流，避免重复请求
        resource = preloadedResource
      } else {
        const playable = await canPlay(song.id)
        if (token !== playToken) return false
        if (!playable) {
          loading.value = false
          await handleConsecutiveFailure('该歌曲暂无版权')
          return false
        }

        resource = await getSongResource(song.id, quality.value)
        if (token !== playToken) return false
      }

      if (!resource) {
        loading.value = false
        await handleConsecutiveFailure('该歌曲暂无可用音源')
        return false
      }
      if (resource.freeTrial) {
        notify({ message: '该歌曲仅支持试听，将播放试听片段', type: 'warning' })
      }

      audio.src = resource.url
      await audio.play()
      if (token !== playToken) return false
      loading.value = false

      const lyric = await lyricPromise
      if (token !== playToken) return false
      lyricStr.value = lyric
      return true
    } catch (error) {
      if (token !== playToken) return false
      loading.value = false
      if (isAbortError(error)) return false
      if (isNotAllowedError(error)) {
        notify({
          message: '播放被系统阻止，请点击播放按钮重试',
          type: 'warning',
        })
        return false
      }
      await handleConsecutiveFailure('音频播放失败')
      return false
    }
  }

  const playByIndex = async (index: number): Promise<boolean> => {
    const list = playlist.value
    if (!Array.isArray(list) || index < 0 || index >= list.length) return false
    return startSong(list[index])
  }

  /** 播放上一首/下一首（FM 模式下改取私人 FM） */
  const advance = async (
    direction: 1 | -1,
    reason: 'manual' | 'ended' | 'failure'
  ) => {
    if (isFm.value) {
      await playFmNext()
      return
    }

    const list = playlist.value
    if (!Array.isArray(list) || list.length === 0) {
      if (reason === 'manual') {
        notify({ message: '播放列表为空', type: 'warning' })
      }
      stopPlayback()
      return
    }

    // 单曲循环只在"自然播完"时重播当前曲，手动切歌/失败跳过仍按列表走
    if (
      cycleMode.value === 0 &&
      reason === 'ended' &&
      current.value.idx !== -1
    ) {
      await replayCurrent()
      return
    }

    const nextIndex =
      cycleMode.value === 2 ? randomIndex() : listEdgeIndex(direction)
    if (nextIndex < 0 || nextIndex >= playlist.value.length) {
      stopPlayback()
      return
    }
    await playByIndex(nextIndex)
  }

  const playFmNext = async () => {
    const song = await getPersonfm()
    if (!song) {
      isFm.value = false
      notify({ message: '私人FM加载失败，已退回列表播放', type: 'warning' })
      if (playlist.value.length > 0 && current.value.idx !== -1) {
        await advance(1, 'ended')
      } else {
        stopPlayback()
      }
      return
    }
    insertSong(song)
    await startSong(song)
  }

  // ---------------- 对外 API ----------------
  /** 初始化播放器（幂等）：绑定 audio 事件、同步音量 */
  const initPlayer = () => {
    audio.volume = clampPercent(volume.value) / 100
    // 异步回填播放队列（v2 ids -> 详情，旧版完整队列自动迁移），不阻塞首帧
    void hydrateQueue()
    if (listenersBound) return
    listenersBound = true
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', syncDuration)
    audio.addEventListener('durationchange', syncDuration)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('seeked', onSeeked)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onAudioError)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
  }

  const onEnded = () => {
    paused.value = true
    stopProgressLoop()
    // ended 是离散事件：先把最终进度立即同步一次（随后切歌会同步归零）
    syncCurrentTime(true)
    if (!current.value.currentSong) return
    void advance(1, 'ended')
  }

  /** 单曲播放：队列里已有则不再请求 /song/detail */
  const playOne = async (id: SongId, fm = false) => {
    const key = toKey(id)
    if (!key) {
      notify({ message: '缺少歌曲 id', type: 'warning' })
      return
    }
    isFm.value = fm

    // 离线启动导致队列回填失败时，在用户点歌前再试一次（非阻塞，不拖慢点歌）
    retryPendingHydration()

    const currentIdx = current.value.idx

    // 当前曲直接点击：暂停中则继续播放，播放中则忽略，不重复请求详情。
    // 队列尚未回填时 idx === -1，此时不能提前 return，要走下面的"拉详情并插入队列"。
    if (key === toKey(songId.value) && currentIdx !== -1) {
      if (audio.paused) {
        if (audio.src) {
          await safePlay()
        } else {
          await playByIndex(currentIdx)
        }
      }
      return
    }

    // 已在队列中：直接切歌
    const index = playlist.value.findIndex((song) => toKey(song?.id) === key)
    if (index !== -1) {
      await playByIndex(index)
      return
    }

    // 不在队列：请求详情后插入队列再播放
    const songs = await getMusicDetail(key)
    if (!songs || songs.length === 0) {
      notify({ message: '歌曲信息获取失败', type: 'warning' })
      return
    }
    const song = songs.find((item) => toKey(item.id) === key) ?? songs[0]
    insertSong(song)
    await startSong(song)
  }

  /** 批量播放：一次 /song/detail 拉取整批详情，替换队列并从第一首开始 */
  const playMulti = async (ids: SongId | SongId[]) => {
    const idList = (Array.isArray(ids) ? ids : toKey(ids).split(','))
      .map((id) => toKey(id).trim())
      .filter((id) => id.length > 0)

    if (idList.length === 0) {
      notify({ message: '缺少歌曲 id', type: 'warning' })
      return
    }

    const songs = await getMusicDetail(idList.join(','))
    if (!songs || songs.length === 0) {
      notify({ message: '歌曲信息获取失败', type: 'warning' })
      return
    }

    // 按请求的 id 顺序排列，接口丢弃的歌曲自动忽略
    const songMap = new Map(songs.map((song) => [toKey(song.id), song]))
    const orderedSongs = idList
      .map((id) => songMap.get(id))
      .filter((song): song is SongDetail => Boolean(song))
    if (orderedSongs.length === 0) {
      notify({ message: '歌曲信息获取失败', type: 'warning' })
      return
    }

    playToken += 1
    consecutiveFailures = 0
    seeking = false
    isFm.value = false
    playlist.value = orderedSongs
    persistQueue()
    songId.value = ''
    currentTime.value = 0
    mediaDuration.value = 0
    lyricStr.value = ''
    resetShufflePool()
    await playByIndex(0)
  }

  /** 播放 / 暂停切换 */
  const togglePlay = async () => {
    if (
      isFm.value &&
      !current.value.currentSong &&
      playlist.value.length === 0
    ) {
      await playFm()
      return
    }
    if (!current.value.currentSong) {
      if (playlist.value.length > 0) {
        await playByIndex(0)
      } else {
        notify({ message: '播放列表为空，请先选择歌曲', type: 'warning' })
      }
      return
    }
    if (audio.paused) {
      if (!audio.src) {
        await playByIndex(current.value.idx)
        return
      }
      // 播放结束后（ended）再点播放：从头重播，而不是停在结尾
      if (audio.ended) {
        await replayCurrent()
        return
      }
      await safePlay()
    } else {
      audio.pause()
    }
  }

  const playNext = async () => {
    await advance(1, 'manual')
  }

  const playPrev = async () => {
    await advance(-1, 'manual')
  }

  const playFm = async () => {
    isFm.value = true
    await playFmNext()
  }

  const openPlayerPage = () => {
    showPlayerPage.value = true
  }

  const closePlayerPage = () => {
    showPlayerPage.value = false
  }

  const toggleLoop = () => {
    cycleMode.value = (Number(cycleMode.value) + 1) % 3
    resetShufflePool()
  }

  const setVolume = (value: number) => {
    const next = clampPercent(value)
    volume.value = next
    audio.volume = next / 100
    if (next > 0) lastNonZeroVolume = next
  }

  const toggleMute = () => {
    if (clampPercent(volume.value) > 0) {
      lastNonZeroVolume = clampPercent(volume.value)
      setVolume(0)
    } else {
      setVolume(lastNonZeroVolume || 60)
    }
  }

  /** 进度条拖动/点击跳转（changeSlider 的推荐新名字） */
  const seek = (value: number) => {
    const target = Number(value)
    if (!Number.isFinite(target)) return
    const total = duration.value
    const next = Math.max(0, total > 0 ? Math.min(target, total) : target)
    currentTime.value = next
    // 拖动期间冻结 timeupdate，避免旧进度把滑块顶回去
    seeking = true
    if (seekTimer) clearTimeout(seekTimer)
    seekTimer = setTimeout(() => {
      seeking = false
      seekTimer = undefined
    }, 300)
    try {
      if (audio.src) audio.currentTime = next
    } catch {
      /* 未加载音源时设置 currentTime 会抛错，忽略 */
    }
  }

  const setPause = () => {
    audio.pause()
    paused.value = true
    stopProgressLoop()
  }

  /** 切换音质：正在播放时重新取流并从原进度继续 */
  const setQuality = async (level: SongLevel) => {
    const next = QUALITY_OPTIONS.includes(level) ? level : DEFAULT_QUALITY
    if (next === quality.value) return

    const previous = quality.value
    quality.value = next

    const song = current.value.currentSong
    if (!song || !audio.src) return

    // 先确认新音质有可用音源，避免"切到不支持的音质"触发播放失败自动跳过
    const resource = await getSongResource(song.id, next)
    if (!resource) {
      quality.value = previous
      notify({
        message: '当前歌曲不支持所选音质，已保留原音质',
        type: 'warning',
      })
      return
    }

    const resumeAt = Number.isFinite(audio.currentTime) ? audio.currentTime : 0
    const wasPaused = audio.paused
    const started = await startSong(song, resource)
    if (!started) return
    if (resumeAt > 0) seek(resumeAt)
    if (wasPaused) audio.pause()
  }

  /** 从队列删除单曲；删的是当前曲时自动播下一首或停止 */
  const removeSong = (id: SongId) => {
    const key = toKey(id)
    if (!key) return
    const list = playlist.value
    const index = list.findIndex((song) => toKey(song?.id) === key)
    if (index === -1) return

    const wasCurrent = key === toKey(songId.value)
    const nextList = list.slice()
    nextList.splice(index, 1)
    playlist.value = nextList
    persistQueue()
    shufflePool = shufflePool.filter((poolKey) => poolKey !== key)

    if (!wasCurrent) return
    if (nextList.length === 0) {
      stopPlayback()
      return
    }
    void playByIndex(Math.min(index, nextList.length - 1))
  }

  /** 清空播放队列并停止播放 */
  const clearPlaylist = () => {
    playlist.value = []
    stopPlayback()
    // 显式写一次空队列：清空本身也是一种需要持久化的状态（避免下次启动复活旧队列）
    persistQueue()
  }

  return {
    // 状态
    playlist,
    volume,
    current,
    songId,
    paused,
    cycleMode,
    currentTime,
    showPlayerPage,
    playlistCount,
    lyricStr,
    isFm,
    duration,
    lyrics,
    activeLyricIndex,
    quality,
    // 方法（旧名字全部保留，新增 togglePlay / seek 等别名）
    initPlayer,
    playMulti,
    tooglePlay: togglePlay,
    togglePlay,
    playNext,
    playPrev,
    playOne,
    playFm,
    openPlayerPage,
    closePlayerPage,
    toggleLoop,
    setVolume,
    toggleMute,
    changeSlider: seek,
    seek,
    setPause,
    setQuality,
    removeSong,
    clearPlaylist,
    playByIndex,
  }
})
