import type { ReactNode } from "react"
import { SessionGuard } from "@/components/security/session-guard"
import { WalletDataProvider } from "@/contexts/wallet-data-context"
import { MyWalletExtensionBridge } from "@/components/extensions/mywallet-extension-bridge"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGuard>
      <WalletDataProvider>
        <MyWalletExtensionBridge />
        {children}
      </WalletDataProvider>
    </SessionGuard>
  )
}
