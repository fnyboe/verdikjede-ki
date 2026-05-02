'use client'

import { useEffect } from 'react'

export function AutoDownload({ id }: { id: string }) {
  useEffect(() => {
    const a = document.createElement('a')
    a.href = `/api/rapport/${id}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [id])

  return null
}
