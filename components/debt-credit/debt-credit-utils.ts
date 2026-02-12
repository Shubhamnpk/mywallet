import { formatCurrency } from "@/lib/utils"

// Security and validation constants
export const SECURITY_CONSTANTS = {
    MAX_ACCOUNT_NAME_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_AMOUNT: 999999999.99,
    MIN_AMOUNT: 0.01,
    MAX_INTEREST_RATE: 100,
    MIN_INTEREST_RATE: 0,
    MAX_ARRAY_SIZE: 1000,
} as const

// Input validation helpers
export const validateAccountName = (name: string): boolean => {
    return typeof name === 'string' &&
        name.length > 0 &&
        name.length <= SECURITY_CONSTANTS.MAX_ACCOUNT_NAME_LENGTH &&
        !/<script/i.test(name) // Basic XSS prevention
}

export const validateAmount = (amount: number | string): boolean => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return !isNaN(num) &&
        isFinite(num) &&
        num >= SECURITY_CONSTANTS.MIN_AMOUNT &&
        num <= SECURITY_CONSTANTS.MAX_AMOUNT
}

export const validateInterestRate = (rate: number | string): boolean => {
    const num = typeof rate === 'string' ? parseFloat(rate) : rate
    return !isNaN(num) &&
        isFinite(num) &&
        num >= SECURITY_CONSTANTS.MIN_INTEREST_RATE &&
        num <= SECURITY_CONSTANTS.MAX_INTEREST_RATE
}

export const calculateInterest = (principal: number, rate: number, timeInYears: number, frequency: string, type: string) => {
    if (rate <= 0 || principal <= 0 || timeInYears <= 0) return 0

    const annualRate = rate / 100

    if (type === 'simple') {
        return principal * annualRate * timeInYears
    } else {
        // Compound interest with proper frequency handling
        const periodsPerYear = frequency === 'yearly' ? 1 : frequency === 'quarterly' ? 4 : 12
        const totalPeriods = timeInYears * periodsPerYear
        const periodicRate = annualRate / periodsPerYear

        return principal * (Math.pow(1 + periodicRate, totalPeriods) - 1)
    }
}

export const getTimeSinceCreation = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - created.getTime())
    return diffTime / (1000 * 60 * 60 * 24 * 365.25) // years
}

export const calculateMinimumPayment = (balance: number, interestRate: number) => {
    // Standard minimum payment is typically 2-3% of balance or $25, whichever is greater
    const percentageBased = balance * 0.025 // 2.5% of balance
    const fixedMinimum = 25 // Minimum payment floor
    return Math.max(percentageBased, fixedMinimum)
}

export const calculatePayoffProjection = (balance: number, monthlyPayment: number, interestRate: number, frequency: string, type: string) => {
    if (monthlyPayment <= 0 || balance <= 0) return { months: 0, totalInterest: 0, totalPaid: 0 }

    let remainingBalance = balance
    let totalInterest = 0
    let months = 0
    const monthlyRate = interestRate / 100 / 12

    while (remainingBalance > 0 && months < 600) { // Max 50 years
        const interestPayment = remainingBalance * monthlyRate
        const principalPayment = Math.min(monthlyPayment - interestPayment, remainingBalance)

        totalInterest += interestPayment
        remainingBalance -= principalPayment
        months++

        if (remainingBalance <= 0.01) break
    }

    return {
        months,
        totalInterest,
        totalPaid: balance + totalInterest,
        monthlyPayment
    }
}

export const getCreditUtilizationStatus = (utilization: number) => {
    if (utilization <= 10) return { status: 'Excellent', color: 'text-green-600', recommendation: 'Keep it low!', score: 850 }
    if (utilization <= 30) return { status: 'Good', color: 'text-green-500', recommendation: 'Good utilization', score: 750 }
    if (utilization <= 50) return { status: 'Fair', color: 'text-yellow-600', recommendation: 'Consider paying down', score: 650 }
    if (utilization <= 70) return { status: 'Poor', color: 'text-orange-600', recommendation: 'Pay down immediately', score: 550 }
    return { status: 'Critical', color: 'text-red-600', recommendation: 'Reduce utilization now!', score: 450 }
}

export const getDebtPayoffStrategy = (debts: any[]) => {
    if (debts.length === 0) return null

    const sortedByInterest = [...debts].sort((a, b) => ((b as any).interestRate || 0) - ((a as any).interestRate || 0))
    const sortedByBalance = [...debts].sort((a, b) => a.balance - b.balance)

    const avalancheSavings = sortedByInterest.reduce((sum, debt, index) => {
        const rate = (debt as any).interestRate || 0
        return sum + (rate * debt.balance * 0.01 * (debts.length - index) / 12)
    }, 0)

    return {
        avalancheDebts: sortedByInterest,
        snowballDebts: sortedByBalance,
        recommendedSavings: avalancheSavings,
        strategy: avalancheSavings > 100 ? 'avalanche' : 'snowball'
    }
}
