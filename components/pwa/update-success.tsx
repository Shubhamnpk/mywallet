'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export default function UpdateSuccess() {
  useEffect(() => {
    try {
      const flag = sessionStorage.getItem('sw_update_success')
      if (flag === '1') {
        sessionStorage.removeItem('sw_update_success')
        // show toast notifying successful update
        toast.success('App updated successfully')
      }
    } catch (e) {
      // ignore
    }
  }, [])

  return null
}
