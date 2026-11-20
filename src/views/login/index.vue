<template>
  <div class="login-page">
    <section class="login-card card-surface">
      <div class="login-brand">
        <img
          class="login-logo"
          src="/logo.svg"
          alt="" />
        <div class="login-brand__text">
          <h1 class="login-title">登录 HaloMusic</h1>
          <p class="login-subtitle">
            使用网易云音乐 App 扫码登录，同步你的歌单与收藏
          </p>
        </div>
      </div>

      <div class="login-qr">
        <img
          v-if="imgSrc"
          :src="imgSrc"
          class="login-qr__img"
          alt="登录二维码"
          @load="addCls" />
        <div
          v-else
          class="login-qr__placeholder">
          <ea-loading
            v-if="loading"
            text="二维码加载中" />
          <span
            v-else
            class="login-qr__failed">
            二维码加载失败
          </span>
        </div>
      </div>

      <p
        v-if="tipMessage"
        class="login-tip">
        {{ tipMessage }}
      </p>

      <button
        v-if="qrFailed"
        type="button"
        class="pill-btn pill-btn--primary login-retry"
        @click="startLogin">
        重新获取二维码
      </button>

      <p class="login-help">
        打开
        <button
          type="button"
          class="login-link"
          @click="openUrl('https://music.163.com/#/download')">
          网易云音乐
        </button>
        App 扫码登录
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  checkLoginStatus,
  handleRequestError,
  openUrl,
  routeTo,
  setCookie,
} from '@/utils/common'
import { qrImgApi, qrKeyApi, qrStatusApi } from './api'
import { useUserInfoStore } from '@/store'
import pinia from '@/store/store'
import notify from '@/components/common/notification/notify'

defineOptions({
  name: 'login',
})

const POLL_INTERVAL = 2000

const route = useRoute()
const userInfoStore = useUserInfoStore(pinia)

const imgSrc = ref('')
const loading = ref(true)
const qrFailed = ref(false)
const tipMessage = ref('')

let timer: ReturnType<typeof setInterval> | undefined
/** 防止上一次轮询请求还没返回时又发一次（800 过期时会触发重新登录） */
let polling = false

const clearTimer = () => {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }
}

const redirectAfterLogin = () => {
  const redirect = route.query.redirect
  const target = typeof redirect === 'string' && redirect ? redirect : '/'
  routeTo(target)
}

const addCls = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.classList.add('gradual-appear')
}

/** 803 登录成功：写入 cookie -> 同步登录态 -> 回跳 */
const handleLoginSuccess = async (cookie?: string) => {
  clearTimer()
  if (cookie) {
    cookie.split(';').forEach(item => {
      const separator = item.indexOf('=')
      if (separator === -1) return
      const key = item.slice(0, separator).trim()
      const value = item.slice(separator + 1).trim()
      if (!key) return
      setCookie(key, value)
    })
  }
  try {
    // checkLoginStatus 在「网络失败」时不会抛错，而是返回当前登录态，
    // 因此必须用返回值判断，避免出现 isLogin=true 但 userInfo=null 的中间态。
    const loginOk = await checkLoginStatus()
    if (!loginOk) {
      notify({ message: '登录状态同步失败，请重试', type: 'warning' })
      void startLogin()
      return
    }
    userInfoStore.setLogin(true)
    notify({ message: '登录成功', type: 'success' })
    redirectAfterLogin()
  } catch (error) {
    console.error('[HaloMusic] login success handler failed:', error)
    handleRequestError(error, '登录状态同步失败，请重试')
  }
}

const pollStatus = async (key: string) => {
  if (polling) return
  polling = true
  try {
    const res = await qrStatusApi({ key })
    if (res.code === 800) {
      // 二维码过期：重新生成（startLogin 内部会清掉旧定时器）
      tipMessage.value = '二维码已过期，正在刷新…'
      await startLogin()
    } else if (res.code === 802) {
      tipMessage.value = '已扫码，请在手机上确认登录'
    } else if (res.code === 803) {
      await handleLoginSuccess(res.cookie)
    }
  } catch (error) {
    // 单次轮询失败不打断整个登录流程，下一轮继续
    console.error('[HaloMusic] poll qr status failed:', error)
  } finally {
    polling = false
  }
}

const startLogin = async () => {
  clearTimer()
  loading.value = true
  qrFailed.value = false
  imgSrc.value = ''
  tipMessage.value = ''
  try {
    const keyRes = await qrKeyApi()
    const unikey = keyRes.data?.unikey
    if (!unikey) throw new Error('未获取到二维码 key')
    const imgRes = await qrImgApi({ key: unikey, qrimg: 'true' })
    imgSrc.value = imgRes.data?.qrimg ?? ''
    if (!imgSrc.value) throw new Error('二维码生成失败')
    loading.value = false
    timer = setInterval(() => {
      void pollStatus(unikey)
    }, POLL_INTERVAL)
  } catch (error) {
    console.error('[HaloMusic] start qr login failed:', error)
    loading.value = false
    qrFailed.value = true
    tipMessage.value = '二维码获取失败，请重试'
  }
}

onMounted(() => {
  // 已登录用户不需要再看二维码，直接回跳
  if (userInfoStore.isLogin && userInfoStore.userInfo?.userId) {
    redirectAfterLogin()
    return
  }
  void startLogin()
})

onBeforeUnmount(clearTimer)
</script>

<style scoped>
/* 登录页：窗口内居中的单卡片 */
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: clamp(16px, 7vh, 72px) 0;
}

.login-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: min(420px, 100%);
  padding: 28px;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.login-logo {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
}

.login-brand__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.login-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.login-subtitle {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.login-qr {
  display: flex;
  justify-content: center;
}

.login-qr__img,
.login-qr__placeholder {
  width: 200px;
  height: 200px;
  border-radius: var(--radius-lg);
}

.login-qr__img {
  display: block;
  object-fit: contain;
  opacity: 0;
}

.login-qr__img.gradual-appear {
  opacity: 1;
  transition: opacity var(--motion-base) var(--ease-standard);
}

.login-qr__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background-color: var(--color-secondary-bg);
  color: var(--color-text-muted);
}

.login-qr__failed {
  font-size: 0.8125rem;
}

.login-tip {
  margin: 0;
  text-align: center;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.login-retry {
  align-self: center;
}

.login-help {
  margin: 0;
  text-align: center;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.login-link {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-primary);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.login-link:hover {
  text-decoration: underline;
}
</style>
