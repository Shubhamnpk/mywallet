export interface TransactionData {
  amount: string
  description: string
  category: string
  type: "income" | "expense"
  date?: string
  receiptImage?: string
}

export interface ExtractedData {
  amount: string
  merchant: string
  date: string
  items: string[]
  total: string
}
