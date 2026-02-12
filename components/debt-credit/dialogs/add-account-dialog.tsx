import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Zap, TrendingDown, CreditCard } from "lucide-react"
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
    onAddDebt: () => void
    onAddCredit: () => void
    userProfile: UserProfile
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
    onAddDebt,
    onAddCredit,
    userProfile
}: AddAccountDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
                <div className={`absolute top-0 left-0 w-full h-1.5 ${activeTab === 'debt' ? 'bg-destructive' : 'bg-primary'}`} />

                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <div className={`p-2 rounded-full ${activeTab === 'debt' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                            {activeTab === 'debt' ? <TrendingDown className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                        </div>
                        Add {activeTab === "debt" ? "Debt" : "Credit"} Account
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={onTabChange} className="mt-2">
                    <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/50 rounded-xl">
                        <TabsTrigger
                            value="debt"
                            className="rounded-lg data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground transition-all duration-300"
                        >
                            Debt Account
                        </TabsTrigger>
                        <TabsTrigger
                            value="credit"
                            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
                        >
                            Credit Account
                        </TabsTrigger>
                    </TabsList>

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

                            <div className="space-y-2">
                                <Label htmlFor="debt-balance" className="text-sm font-medium">
                                    Current Balance ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                                        {getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                                    </span>
                                    <Input
                                        id="debt-balance"
                                        type="number"
                                        required
                                        step="0.01"
                                        min="0"
                                        value={debtForm.balance}
                                        onChange={(e) => setDebtForm({ ...debtForm, balance: e.target.value })}
                                        placeholder="0.00"
                                        className="h-11 pl-9 font-mono text-base shadow-sm focus-visible:ring-destructive"
                                    />
                                </div>
                            </div>

                            {!debtForm.isFastDebt && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                                            placeholder="0.00"
                                            className="h-11 shadow-sm focus-visible:ring-destructive"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="debt-frequency" className="text-sm font-medium">Frequency</Label>
                                        <select
                                            id="debt-frequency"
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

                            <div className="space-y-2">
                                <Label htmlFor="debt-payment" className="text-sm font-medium">
                                    Min Payment ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                                        {getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                                    </span>
                                    <Input
                                        id="debt-payment"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={debtForm.minimumPayment}
                                        onChange={(e) => setDebtForm({ ...debtForm, minimumPayment: e.target.value })}
                                        placeholder="0.00"
                                        className="h-11 pl-9 shadow-sm focus-visible:ring-destructive"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-11 font-medium">
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 h-11 bg-destructive hover:bg-destructive/90 text-white shadow-md hover:shadow-lg transition-all"
                                >
                                    <Plus className="w-5 h-5 mr-2" />
                                    Add Debt Account
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="credit-balance" className="text-sm font-medium">
                                        Current Balance
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                                            {getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                                        </span>
                                        <Input
                                            id="credit-balance"
                                            type="number"
                                            required
                                            step="0.01"
                                            min="0"
                                            value={creditForm.balance}
                                            onChange={(e) => setCreditForm({ ...creditForm, balance: e.target.value })}
                                            placeholder="0.00"
                                            className="h-11 pl-9 font-mono text-base shadow-sm focus-visible:ring-primary"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="credit-limit" className="text-sm font-medium">
                                        Credit Limit
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                                            {getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                                        </span>
                                        <Input
                                            id="credit-limit"
                                            type="number"
                                            required
                                            step="0.01"
                                            min="0"
                                            value={creditForm.creditLimit}
                                            onChange={(e) => setCreditForm({ ...creditForm, creditLimit: e.target.value })}
                                            placeholder="0.00"
                                            className="h-11 pl-9 font-mono text-base shadow-sm focus-visible:ring-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                                        placeholder="0.00"
                                        className="h-11 shadow-sm focus-visible:ring-primary"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="credit-frequency" className="text-sm font-medium">Frequency</Label>
                                    <select
                                        id="credit-frequency"
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
                                        value={creditForm.interestType}
                                        onChange={(e) => setCreditForm({ ...creditForm, interestType: e.target.value })}
                                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                                    >
                                        <option value="simple">Simple</option>
                                        <option value="compound">Compound</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="credit-payment" className="text-sm font-medium">
                                    Min Payment ({getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)})
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                                        {getCurrencySymbol(userProfile.currency, (userProfile as any).customCurrency)}
                                    </span>
                                    <Input
                                        id="credit-payment"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={creditForm.minimumPayment}
                                        onChange={(e) => setCreditForm({ ...creditForm, minimumPayment: e.target.value })}
                                        placeholder="0.00"
                                        className="h-11 pl-9 shadow-sm focus-visible:ring-primary"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-11 font-medium">
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
                                >
                                    <Plus className="w-5 h-5 mr-2" />
                                    Add Credit Account
                                </Button>
                            </div>
                        </form>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
