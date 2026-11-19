/**
 * 第三方模块的最小类型声明垫片（d.ts 全局脚本，无顶层 import/export）。
 *
 * 背景：
 * `NeteaseCloudMusicApi`（4.34.1）在 package.json 里声明了
 * `"types": "./interface.d.ts"`，但该文件只有请求参数类型，缺少
 * `serveNcmApi` 的导出声明，直接默认导入会报“不存在 serveNcmApi”。
 * 这里按本项目实际用法补一份最小声明，保证 `tsc -p tsconfig.node.json`
 * 能对 electron/ 下的源码做严格类型检查。
 *
 * 维护提示：若后续该包补齐官方类型（或引入 @types/NeteaseCloudMusicApi），
 * 请删除本文件的 `declare module`，避免宽松声明遮蔽官方类型。
 * 注意：express / express-http-proxy 已有官方 @types，不要在这里重复声明。
 */

declare module 'NeteaseCloudMusicApi' {
  interface ServeNcmApiOptions {
    port?: number | string
    /** 监听地址。库默认值为 ''（所有网卡），本项目必须显式传 127.0.0.1 */
    host?: string
    /** 启动时是否联网检查 npm 最新版本 */
    checkVersion?: boolean
    moduleDefs?: unknown
  }

  interface NcmApiServerApp {
    /** serveNcmApi 内部 app.listen() 返回的 http.Server，用于优雅关闭 */
    server?: import('node:http').Server
  }

  const NeteaseCloudMusicApi: {
    serveNcmApi(options?: ServeNcmApiOptions): Promise<NcmApiServerApp>
  }

  export default NeteaseCloudMusicApi
}
