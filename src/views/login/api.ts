import http from "@/utils/request";

export const qrStatusApi = (params: { key: string }) => {
  return http({
    url: "/login/qr/check",
    method: "get",
    params,
  });
};

export const qrKeyApi = () => {
  return http({
    url: "/login/qr/key",
    method: "get",
  });
};

export const qrImgApi = (params: { key: string; qrimg: string }) => {
  return http({
    url: "/login/qr/create",
    method: "get",
    params,
  });
};

// 登陆状态
export const loginStatusApi = () => {
  return http({
    url: "/login/status",
    method: "get",
  });
};


// 退出登录
export function logoutApi() {
  return http({
    url: '/logout',
    method: 'post',
  });
}