<template>
  <div class="flex flex-col items-center">
    <div class="mt-8 font-bold text-2xl cursor-default">登录网易云账号</div>
    <div class="relative w-48 h-48 mt-8">
      <img
        v-if="imgSrc"
        :src="imgSrc"
        class="w-48 h-48 opacity-0 rounded-2xl"
        alt="登录二维码"
        @load="addCls" />
      <div
        v-else
        class="w-48 h-48 rounded-2xl bg-gray-100 flex items-center justify-center">
        <ea-loading
          v-if="loading"
          :size="28" />
        <div
          v-else
          class="text-sm text-gray-500">
          二维码加载失败
        </div>
      </div>
    </div>
    <div class="mt-4 text-base font-bold">
      打开<span
        class="text-blue-600 cursor-pointer hover:underline"
        @click="openUrl('https://music.163.com/#/download')"
        >网易云音乐</span
      >扫码登录
    </div>
    <div
      v-if="tipMessage"
      class="mt-2 text-sm text-gray-500">
      {{ tipMessage }}
    </div>
    <ea-button
      v-if="qrFailed"
      type="primary"
      class="mt-4"
      @click="startLogin">
      <div class="text-base font-bold">重新获取二维码</div>
    </ea-button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { checkLoginStatus, openUrl, routeTo, setCookie } from '@/utils/common'
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
    await checkLoginStatus()
    userInfoStore.setLogin(true)
    notify({ message: '登录成功', type: 'success' })
    redirectAfterLogin()
  } catch (error) {
    console.error('[HaloMusic] login success handler failed:', error)
    notify({ message: '登录状态同步失败，请重试', type: 'error' })
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
.gradual-appear {
  opacity: 1;
  transition: opacity var(--motion-slow) var(--ease-standard);
}
</style>
