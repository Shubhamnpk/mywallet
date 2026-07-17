import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AmountInput } from "@/components/ui/amount-input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Zap, TrendingDown, CreditCard, HandCoins, Banknote, ChevronDown, ChevronUp, Edit as EditIcon } from "lucide-react"
import { getCurrencySymbol } from "@/lib/utils"
import type { UserProfile } from "@/types/wallet"

interface AddAccountDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    activeTab: string
    onTabChange: (value: string) => void
    debtForm: any
    setDebtForm: (form: any) => void
    creditForm: any
    setCreditForm: (form: any) => void
    lendForm?: any
    setLendForm?: (form: any) => void
    onAddDebt: () => void
    onAddCredit: () => void
    onAddLend?: () => void
    userProfile: UserProfile
    editingDebtId?: string | null
    editingCreditId?: string | null
}

export function AddAccountDialog({
    open,
    onOpenChange,
    activeTab,
    onTabChange,
    debtForm,
    setDebtForm,
    creditForm,
    setCreditForm,
    lendForm,
    setLendForm,
    onAddDebt,
    onAddCredit,
    onAddLend,
    userProfile,
    editingDebtId,
    editingCreditId,
}: AddAccountDialogProps) {
    const isEditingDebt = !!editingDebtId
    const isEditingCredit = !!editingCreditId
    const isEditingLend = !!editingDebtId && activeTab === "lend"
    const isEditing = isEditingDebt || isEditingCredit || isEditingLend
    const tabColors: Record<string, { bar: string; iconBg: string; iconText: string; icon: React.ReactNode; label: string }> = {
        debt: { bar: 'bg-destructive', iconBg: 'bg-destructive/10 text-destructive', iconText: 'text-destructive', icon: <TrendingDown className="w-5 h-5" />, label: "Debt" },
        lend: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-500/10 text-emerald-600', iconText: 'text-emerald-600', icon: <HandCoins className="w-5 h-5" />, label: "Lending" },
        credit: { bar: 'bg-primary', iconBg: 'bg-primary/10 text-primary', iconText: 'text-primary', icon: <CreditCard className="w-5 h-5" />, label: "Credit" },
    }
    const tc = tabColors[activeTab] || tabColors.debt
    const [showLendAdvanced, setShowLendAdvanced] = useState(false)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
                <div className={`absolute top-0 left-0 w-full h-1.5 ${tc.bar}`} />

                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <div className={`p-2 rounded-full ${tc.iconBg}`}>
                            {tc.icon}
                        </div>
                        {isEditing ? 'Edit' : 'Add'} {tc.label} Account
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={onTabChange} className="mt-2">
                    {!isEditing && (
                        <TabsList className="grid w-full grid-cols-3 h-11 p-1 bg-muted/50 rounded-xl">
                            <TabsTrigger
                                value="debt"
                                className="rounded-lg data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground transition-all duration-300"
                            >
                                Debt
                            </TabsTrigger>
                            <TabsTrigger
                                value="lend"
                                className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white transition-all duration-300"
                            >
                                Lending
                            </TabsTrigger>
                            <TabsTrigger
                                value="credit"
                                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
                            >
                                Credit
                            </TabsTrigger>
                        </TabsList>
                    )}

                    <TabsContent value="debt" className="space-y-4 mt-4 animate-in fade-in-50 slide-in-from-left-4 duration-300">
                        <form onSubmit={(e) => { e.preventDefault(); onAddDebt(); }} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="debt-name" className="text-sm font-medium">Account Name</Label>
                                <Input
                                    id="debt-name"
                                    required
                                    value={debtForm.name}
                                    onChange={(e) => setDebtForm({ ...debtForm, name: e.target.value })}
                                    placeholder="e.g., Student Loan, Personal Loan"
                                    className="h-11 shadow-sm focus-visible:ring-destructive"
                                />
                            </div>

                            <div className="flex items-center space-x-2 p-3 bg-orange-500/5 rounded-lg border border-orange-500/10">
                                <Checkbox
                                    id="debt-fast"
                                    checked={debtForm.isFastDebt}
                                    onCheckedChange={(checked) => setDebtForm({ ...debtForm, isFastDebt: checked as boolean })}
                                    className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                                />
                                <Label htmlFor="debt-fast" className="text-sm font-medium flex items-center gap-2 cursor-pointer w-full">
                                    <Zap className="w-4 h-4 text-orange-500" />
                                    Fast Debt Tracker
                                    <span className="text-xs text-muted-foreground font-normal ml-auto hidden sm:inline">(No Interest/Min Pay)</span>
                                </Label>
                            </div>

                            <AmountInput
                                id="debt-balance"
                                label={`Current Balance (${getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})`}
                                value={debtForm.balance}
                                onChange={(value) => setDebtForm({ ...debtForm, balance: value })}
                                currencySymbol={getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                                required
                                className="h-11 font-mono text-base shadow-sm focus-visible:ring-destructive"
                            />

                            {!debtForm.isFastDebt && (
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="debt-rate" className="text-sm font-medium">Interest (%)</Label>
                                        <Input
                                            id="debt-rate"
                                            type="number"
                                            required
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={debtForm.interestRate}
                                            onChange={(e) => setDebtForm({ ...debtForm, interestRate: e.target.value })}
                                                        className="h-11 shadow-sm focus-visible:ring-destructive"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="debt-frequency" className="text-sm font-medium">Frequency</Label>
                                        <select
                                            id="debt-frequency"
                                            title="debt-frequncy"
                                            value={debtForm.interestFrequency}
                                            onChange={(e) => setDebtForm({ ...debtForm, interestFrequency: e.target.value })}
                                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                                        >
                                            <option value="yearly">Yearly</option>
                                            <option value="quarterly">Quarterly</option>
                                            <option value="monthly">Monthly</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="debt-type" className="text-sm font-medium">Type</Label>
                                        <select
                                            id="debt-type"
                                            title="dept-type"
                                            value={debtForm.interestType}
                                            onChange={(e) => setDebtForm({ ...debtForm, interestType: e.target.value })}
                                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                                        >
                                            <option value="simple">Simple</option>
                                            <option value="compound">Compound</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <AmountInput
                                id="debt-min-payment"
                                label={`Minimum Payment (${getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})`}
                                value={debtForm.minimumPayment}
                                onChange={(value) => setDebtForm({ ...debtForm, minimumPayment: value })}
                                currencySymbol={getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                                className="h-11 shadow-sm focus-visible:ring-destructive"
                            />

                            <div className="flex flex-row gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-11 font-medium">
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 h-11 bg-destructive hover:bg-destructive/90 text-white shadow-md hover:shadow-lg transition-all"
                                >
                                    {isEditingDebt ? <EditIcon className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                                    {isEditingDebt ? 'Save Changes' : 'Add Debt Account'}
                                </Button>
                            </div>
                        </form>
                    </TabsContent>

                    <TabsContent value="lend" className="space-y-4 mt-4 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
                        <form onSubmit={(e) => { e.preventDefault(); onAddLend?.(); }} className="space-y-3">
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={(lendForm?.source || "wallet") === "wallet" ? "default" : "outline"}
                                    onClick={() => setLendForm?.({ ...lendForm, source: "wallet" })}
                                    className={`flex-1 h-10 text-xs ${lendForm?.source === "wallet" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}`}
                                >
                                    <Banknote className="w-3.5 h-3.5 mr-1" />
                                    From Wallet
                                </Button>
                                <Button
                                    type="button"
                                    variant={(lendForm?.source || "wallet") === "external" ? "default" : "outline"}
                                    onClick={() => setLendForm?.({ ...lendForm, source: "external" })}
                                    className={`flex-1 h-10 text-xs ${(lendForm?.source || "wallet") === "external" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                                >
                                    External / Cash
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="lend-person" className="text-xs font-medium">Name</Label>
                                    <Input
                                        id="lend-person"
                                        required
                                        value={lendForm?.name || ""}
                                        onChange={(e) => setLendForm?.({ ...lendForm, name: e.target.value })}
                                        placeholder="Person name"
                                        className="h-9 text-sm shadow-sm focus-visible:ring-emerald-500"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="lend-phone" className="text-xs font-medium">Phone</Label>
                                    <Input
                                        id="lend-phone"
                                        value={lendForm?.phone || ""}
                                        onChange={(e) => setLendForm?.({ ...lendForm, phone: e.target.value })}
                                        placeholder="98XXXXXXXX"
                                        className="h-9 text-sm shadow-sm focus-visible:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <AmountInput
                                id="lend-amount"
                                label={`Amount (${getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})`}
                                value={lendForm?.amount || ""}
                                onChange={(value) => setLendForm?.({ ...lendForm, amount: value })}
                                currencySymbol={getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                                required
                                className="h-9 font-mono text-sm shadow-sm focus-visible:ring-emerald-500"
                            />

                            <button
                                type="button"
                                onClick={() => setShowLendAdvanced(!showLendAdvanced)}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full pt-1"
                            >
                                {showLendAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                {showLendAdvanced ? "Hide details" : "Show details"}
                            </button>

                            {showLendAdvanced && (
                                <div className="space-y-3 pt-1">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="lend-rate" className="text-xs font-medium">Interest (%)</Label>
                                        <Input
                                            id="lend-rate"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={lendForm?.interestRate || ""}
                                            onChange={(e) => setLendForm?.({ ...lendForm, interestRate: e.target.value })}
                                            placeholder="0 (no interest)"
                                            className="h-9 text-sm shadow-sm focus-visible:ring-emerald-500"
                                        />
                                    </div>

                                    {(lendForm?.interestRate && Number.parseFloat(lendForm.interestRate) > 0) && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="lend-frequency" className="text-xs font-medium">Frequency</Label>
                                                <select
                                                    id="lend-frequency"
                                                    title="lend-frequency"
                                                    value={lendForm?.interestFrequency || "yearly"}
                                                    onChange={(e) => setLendForm?.({ ...lendForm, interestFrequency: e.target.value })}
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 shadow-sm"
                                                >
                                                    <option value="yearly">Yearly</option>
                                                    <option value="quarterly">Quarterly</option>
                                                    <option value="monthly">Monthly</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="lend-type" className="text-xs font-medium">Type</Label>
                                                <select
                                                    id="lend-type"
                                                    title="lend-type"
                                                    value={lendForm?.interestType || "simple"}
                                                    onChange={(e) => setLendForm?.({ ...lendForm, interestType: e.target.value })}
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 shadow-sm"
                                                >
                                                    <option value="simple">Simple</option>
                                                    <option value="compound">Compound</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    </div>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="lend-notes" className="text-xs font-medium">Notes</Label>
                                <Input
                                    id="lend-notes"
                                    value={lendForm?.notes || ""}
                                    onChange={(e) => setLendForm?.({ ...lendForm, notes: e.target.value })}
                                    placeholder="Any notes about this loan"
                                    className="h-9 text-sm shadow-sm focus-visible:ring-emerald-500"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-10 text-sm font-medium">
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg transition-all text-sm"
                                >
                                    {isEditingLend ? <EditIcon className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
                                    {isEditingLend ? 'Save Changes' : 'Add'}
                                </Button>
                            </div>
                        </form>
                    </TabsContent>

                    <TabsContent value="credit" className="space-y-6 animate-in fade-in-50 slide-in-from-right-4 duration-300">
                        <form onSubmit={(e) => { e.preventDefault(); onAddCredit(); }} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="credit-name" className="text-sm font-medium">Card/Account Name</Label>
                                <Input
                                    id="credit-name"
                                    required
                                    value={creditForm.name}
                                    onChange={(e) => setCreditForm({ ...creditForm, name: e.target.value })}
                                    placeholder="e.g., Visa Gold, Mastercard"
                                    className="h-11 shadow-sm focus-visible:ring-primary"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <AmountInput
                                    id="credit-balance"
                                    label="Current Balance"
                                    value={creditForm.balance}
                                    onChange={(value) => setCreditForm({ ...creditForm, balance: value })}
                                    currencySymbol={getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                                    required
                                        className="h-11 font-mono text-base shadow-sm focus-visible:ring-primary"
                                />
                                <AmountInput
                                    id="credit-limit"
                                    label="Credit Limit"
                                    value={creditForm.creditLimit}
                                    onChange={(value) => setCreditForm({ ...creditForm, creditLimit: value })}
                                    currencySymbol={getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                                    required
                                        className="h-11 font-mono text-base shadow-sm focus-visible:ring-primary"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="credit-rate" className="text-sm font-medium">Interest (%)</Label>
                                    <Input
                                        id="credit-rate"
                                        type="number"
                                        required
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={creditForm.interestRate}
                                        onChange={(e) => setCreditForm({ ...creditForm, interestRate: e.target.value })}
                                                className="h-11 shadow-sm focus-visible:ring-primary"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="credit-frequency" className="text-sm font-medium">Frequency</Label>
                                    <select
                                        id="credit-frequency"
                                        title="Interest compounding frequency"
                                        value={creditForm.interestFrequency}
                                        onChange={(e) => setCreditForm({ ...creditForm, interestFrequency: e.target.value })}
                                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                                    >
                                        <option value="yearly">Yearly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="credit-type" className="text-sm font-medium">Type</Label>
                                    <select
                                        id="credit-type"
                                        title="credit-type"
                                        value={creditForm.interestType}
                                        onChange={(e) => setCreditForm({ ...creditForm, interestType: e.target.value })}
                                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                                    >
                                        <option value="simple">Simple</option>
                                        <option value="compound">Compound</option>
                                    </select>
                                </div>
                            </div>

                            <AmountInput
                                id="credit-payment"
                                label={`Min Payment (${getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})`}
                                value={creditForm.minimumPayment}
                                onChange={(value) => setCreditForm({ ...creditForm, minimumPayment: value })}
                                currencySymbol={getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                                className="h-11 shadow-sm focus-visible:ring-primary"
                            />

                            <div className="flex flex-row gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-11 font-medium">
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
                                >
                                    {isEditingCredit ? <EditIcon className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                                    {isEditingCredit ? 'Save Changes' : 'Add Credit Account'}
                                </Button>
                            </div>
                        </form>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
