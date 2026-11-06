// 流量格式化, 与后端 util.Bytefmt 行为一致
export function bytefmt(bytes) {
  const n = Number(bytes)
  if (!isFinite(n)) return '-'
  if (n < 0) return '无限制'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return (i === 0 ? v : v.toFixed(2)) + ' ' + units[i]
}

// 用户表 passwordShow 字段是原始密码的 base64
export function decodePass(b64) {
  try {
    return decodeURIComponent(escape(atob(b64)))
  } catch {
    try {
      return atob(b64)
    } catch {
      return ''
    }
  }
}

export function quotaText(quota) {
  const q = Number(quota)
  if (q < 0) return '无限制'
  if (q === 0) return '已用尽'
  return bytefmt(q)
}

export function percent(n) {
  const v = Number(n)
  if (!isFinite(v)) return '0%'
  return v.toFixed(1) + '%'
}
