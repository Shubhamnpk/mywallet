"use client"

import { useMemo } from "react"
import { useWalletData } from "@/contexts/wallet-data-context"

export function useDebtCreditData() {
  const wallet = useWalletData()

  return useMemo(
    () => ({
      debtAccounts: wallet.debtAccounts,
      creditAccounts: wallet.creditAccounts,
      debtCreditTransactions: wallet.debtCreditTransactions,
      balance: wallet.balance,
      addDebtAccount: wallet.addDebtAccount,
      addCreditAccount: wallet.addCreditAccount,
      updateDebtAccount: wallet.updateDebtAccount,
      updateCreditAccount: wallet.updateCreditAccount,
      deleteDebtAccount: wallet.deleteDebtAccount,
      deleteCreditAccount: wallet.deleteCreditAccount,
      addFromDebt: wallet.addFromDebt,
      makeDebtPayment: wallet.makeDebtPayment,
      updateCreditBalance: wallet.updateCreditBalance,
      createDebtForTransaction: wallet.createDebtForTransaction,
      completeTransactionWithDebt: wallet.completeTransactionWithDebt,
      addDebtToAccount: wallet.addDebtToAccount,
      addTransaction: wallet.addTransaction,
    }),
    [
      wallet.debtAccounts,
      wallet.creditAccounts,
      wallet.debtCreditTransactions,
      wallet.balance,
      wallet.addDebtAccount,
      wallet.addCreditAccount,
      wallet.updateDebtAccount,
      wallet.updateCreditAccount,
      wallet.deleteDebtAccount,
      wallet.deleteCreditAccount,
      wallet.addFromDebt,
      wallet.makeDebtPayment,
      wallet.updateCreditBalance,
      wallet.createDebtForTransaction,
      wallet.completeTransactionWithDebt,
      wallet.addDebtToAccount,
      wallet.addTransaction,
    ],
  )
}
