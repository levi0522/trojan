// API 封装: 同源请求, jwt 同时走 cookie 与 Authorization 头
const TOKEN_KEY = 'trojan_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export async function request(path, { method = 'GET', form, body } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers['Authorization'] = 'Bearer ' + token
  let payload = body
  if (form) {
    payload = new URLSearchParams(form)
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }
  const resp = await fetch(path, { method, headers, body: payload, credentials: 'same-origin' })
  if (resp.status === 401) {
    setToken('')
    window.dispatchEvent(new Event('trojan:unauthorized'))
    throw new ApiError('登录已过期, 请重新登录', 401)
  }
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    throw new ApiError(data.message || data.Msg || ('请求失败: ' + resp.status), resp.status)
  }
  return data
}

// 后端统一响应 { Duration, Data, Msg }, Msg != "success" 视为业务错误
export async function call(path, options) {
  const data = await request(path, options)
  if (data.Msg && data.Msg !== 'success') {
    throw new ApiError(data.Msg, 200)
  }
  return data.Data
}
