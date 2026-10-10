'use client'

export function siteFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('X-Karyakita-Client', 'website')

  return fetch(input, {
    ...init,
    credentials: 'same-origin',
    headers,
  })
}
