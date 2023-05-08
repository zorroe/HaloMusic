// http.ts
import axios, { type AxiosRequestConfig } from "axios";
import { handleLogin } from "@/utils/common";

// 配置Contenttype
axios.defaults.headers.post["Content-Type"] = "application/json;charset=UTF-8";
axios.defaults.withCredentials = true;

// var url = "https://service-0g03ogpy-1254067389.gz.apigw.tencentcs.com/release";
// const url = "http://localhost:16666";
var url;
if (process.env.VITE_DEV_SERVER_URL) {
  // electron-vite-vue#298
  // win.loadURL(url)
  // win.loadURL('http://localhost:17777')
  url = "http://localhost:16666";
  // Open devTool if the app is not packaged
  // win.webContents.openDevTools()
} else {
  url = "/api";
  // win.loadFile(indexHtml)
}

const http = axios.create({
  // axios中请求配置有baseURL选项，表示请求URL公共部分
  baseURL: url,
  // 超时
  timeout: 60000,
  withCredentials: true,
});

http.interceptors.request.use(
  (config: AxiosRequestConfig | any) => {
    config.params = {
      ...config.params,
      timestamp: Date.now(),
    };
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

// 添加响应拦截器
http.interceptors.response.use(
  (response) => {
    const res = response.data;
    return res;
  },
  async (error) => {
    /** @type {import('axios').AxiosResponse | null} */
    const response = error.response;
    const data = response.data;

    if (
      response &&
      typeof data === "object" &&
      data.code === 301 &&
      data.msg === "需要登录"
    ) {
      handleLogin();
    }
  }
);

export default http;
