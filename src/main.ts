/**
 * 渲染进程入口。
 *
 * 注意：这里只做「装配」——样式、全局组件、错误兜底、挂载。
 * 具体逻辑一律下沉到 store / utils / 视图组件，避免入口变重。
 */
import '@/assets/css/tailwind.css'
import '@/assets/css/global.scss'
import '@/assets/css/motion.css'
import '@/style.scss'
import '@/assets/css/slider.css'

import { createApp, nextTick } from 'vue'
import App from '@/App.vue'
import router from '@/router/index'
import pinia from '@/store/store'
import notify from '@/components/common/notification/notify'
import { isCanceledError } from '@/utils/request'
import { initTheme } from '@/utils/theme'

// 主题要在挂载前应用，避免首帧闪现错误配色
initTheme()

import Image from '@/components/common/Image.vue'
import IconPark from '@/components/common/IconPark.vue'
import PlayListCover from '@/components/common/PlayListCover.vue'
import ArtistCover from '@/components/common/ArtistCover.vue'
import AlbumCover from '@/components/common/AlbumCover.vue'
import TopListCover from '@/components/common/TopListCover.vue'
import UserCover from '@/components/common/UserProfileCover.vue'
import MusicTable from '@/components/common/MusicTable.vue'
import MvCover from '@/components/common/MvCover.vue'
import EaButton from '@/components/common/EaButton.vue'
import EaModal from '@/components/common/EaModal.vue'
import EaDrawer from '@/components/common/drawer/EaDrawer.vue'
import EaLoading from '@/components/common/EaLoading.vue'
import EaSkeleton from '@/components/common/EaSkeleton.vue'
import EaEmpty from '@/components/common/EaEmpty.vue'
import VueSlider from 'vue-slider-component'

const app = createApp(App)

app
  .component('icon-park', IconPark)
  .component('lmg', Image)
  .component('play-list-cover', PlayListCover)
  .component('artist-cover', ArtistCover)
  .component('album-cover', AlbumCover)
  .component('top-list-cover', TopListCover)
  .component('user-cover', UserCover)
  .component('music-table', MusicTable)
  .component('mv-cover', MvCover)
  .component('ea-button', EaButton)
  .component('ea-modal', EaModal)
  .component('ea-drawer', EaDrawer)
  .component('ea-loading', EaLoading)
  .component('ea-skeleton', EaSkeleton)
  .component('ea-empty', EaEmpty)
  .component('vue-slider', VueSlider)

/**
 * 全局兜底：组件内未捕获的异常不再只丢到控制台，给用户一个可见提示。
 * 真正的错误信息仍然保留在 console.error，方便 Electron devtools 排查。
 */
app.config.errorHandler = (err, _instance, info) => {
  console.error('[HaloMusic] unhandled component error:', err, info)
  notify({ message: '页面出现异常，请稍后重试', type: 'error' })
}

window.addEventListener('unhandledrejection', event => {
  const reason: unknown = event.reason

  // 路由切换会主动取消上一页在途的 GET 请求，这是预期行为：
  // 既不打印错误也不弹提示，避免用户切页时看到「操作失败」。
  if (isCanceledError(reason)) return

  console.error('[HaloMusic] unhandled promise rejection:', reason)
  const message = reason instanceof Error ? reason.message : String(reason ?? '')
  // 网络层已经 notify 过的错误不重复提示（notify 内部有相同消息去重）
  if (message && message.length <= 80) {
    notify({ message: `操作失败：${message}`, type: 'error' })
  } else {
    notify({ message: '操作失败，请稍后重试', type: 'error' })
  }
})

app.use(pinia)
app.use(router)
app.mount('#app')

// 通知 preload 注入的启动动画退出；放在 nextTick 之后，保证首屏已经渲染
nextTick(() => {
  window.postMessage({ payload: 'removeLoading' }, '*')
})
