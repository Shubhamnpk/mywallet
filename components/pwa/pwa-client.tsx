'use client'

import RegisterSW from './register-sw'
import InstallButton from './install-button'

export default function PWAClient() {
  return (
    <>
      <RegisterSW />
      <InstallButton />
    </>
  )
}
