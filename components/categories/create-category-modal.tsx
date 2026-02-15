"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Plus,
  Search,
  Check,
  ChevronDown
} from "lucide-react"
import { AVAILABLE_ICONS } from "@/lib/categories"
import { cn } from "@/lib/utils"

interface CreateCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateCategory: (category: {
    name: string
    type: "income" | "expense"
    color: string
    icon: string
  }) => void
  categoryType?: "income" | "expense"
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"
]

const POPULAR_ICONS = [
  "🍽️", "🚗", "🛍️", "🏠", "💼", "🎬", "🏥", "📚",
  "✈️", "🛒", "⚡", "🎵", "💻", "🏃", "📱", "🎁",
  "💰", "💸", "🎯", "📊", "💳", "🍕", "☕", "🎮"
]

const ICON_CATEGORIES = [
  { id: "popular", label: "Popular", emoji: "⭐" },
  { id: "food", label: "Food", emoji: "🍽️" },
  { id: "transport", label: "Transport", emoji: "🚗" },
  { id: "shopping", label: "Shopping", emoji: "🛍️" },
  { id: "entertainment", label: "Fun", emoji: "🎬" },
  { id: "work", label: "Work", emoji: "💼" },
  { id: "home", label: "Home", emoji: "🏠" }
]

export function CreateCategoryModal({
  isOpen,
  onClose,
  onCreateCategory,
  categoryType = "expense"
}: CreateCategoryModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: categoryType,
    color: "#3b82f6",
    icon: "📦"
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIconCategory, setSelectedIconCategory] = useState("popular")
  const [showIconPicker, setShowIconPicker] = useState(false)

  const filteredIcons = useMemo(() => {
    if (searchQuery.trim()) {
      return AVAILABLE_ICONS?.filter(icon =>
        icon.toLowerCase().includes(searchQuery.toLowerCase())
      ) || []
    }

    if (selectedIconCategory === "popular") {
      return POPULAR_ICONS
    }

    return ICON_CATEGORIES[selectedIconCategory as keyof typeof ICON_CATEGORIES] || POPULAR_ICONS
  }, [searchQuery, selectedIconCategory])

  const handleSubmit = () => {
    if (!formData.name.trim()) return

    onCreateCategory({
      name: formData.name.trim(),
      type: formData.type,
      color: formData.color,
      icon: formData.icon
    })

    // Reset form
    setFormData({
      name: "",
      type: categoryType,
      color: "#3b82f6",
      icon: "📦"
    })
    setSearchQuery("")
    setSelectedIconCategory("popular")
    setShowIconPicker(false)
    onClose()
  }

  const handleClose = () => {
    setFormData({
      name: "",
      type: categoryType,
      color: "#3b82f6",
      icon: "📦"
    })
    setSearchQuery("")
    setSelectedIconCategory("popular")
    setShowIconPicker(false)
    onClose()
  }

  const canCreate = formData.name.trim().length > 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md h-[85vh] flex flex-col bg-card/95 backdrop-blur-md border border-primary/20 shadow-2xl rounded-3xl overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-2 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20 shadow-inner">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">New Category</DialogTitle>
                <p className="text-xs font-medium text-muted-foreground">Create a fresh bucket for your transactions</p>
              </div>
            </div>
            {/* Close button handles itself usually, or we can add a custom one if needed */}
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 w-full overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* Type Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Category Type</label>
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-muted/40 rounded-2xl border border-border/50">
                <Button
                  type="button"
                  variant={formData.type === "expense" ? "default" : "ghost"}
                  onClick={() => setFormData(prev => ({ ...prev, type: "expense" }))}
                  className={cn(
                    "flex-1 h-10 rounded-xl font-bold transition-all",
                    formData.type === "expense"
                      ? "shadow-md bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  )}
                >
                  <span className="mr-2 text-lg">💸</span> Expense
                </Button>
                <Button
                  type="button"
                  variant={formData.type === "income" ? "default" : "ghost"}
                  onClick={() => setFormData(prev => ({ ...prev, type: "income" }))}
                  className={cn(
                    "flex-1 h-10 rounded-xl font-bold transition-all",
                    formData.type === "income"
                      ? "shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  )}
                >
                  <span className="mr-2 text-lg">💰</span> Income
                </Button>
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Category Name</label>
              <div className="relative group">
                <Input
                  placeholder="e.g. Coffee, Groceries, Salary..."
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="h-12 rounded-xl border-border/60 bg-background/50 focus:border-primary/50 focus:ring-primary/20 pl-4 font-semibold shadow-sm transition-all group-hover:border-primary/30"
                  autoFocus
                />
              </div>
            </div>

            {/* Icon & Color Picker */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Appearance</label>
              <div className="grid grid-cols-1 gap-4">
                {/* Icon Trigger */}
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 border border-border/60 rounded-xl bg-background/50 hover:bg-muted/30 transition-all text-left group",
                    showIconPicker && "ring-2 ring-primary/20 border-primary/50"
                  )}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-border/10 transition-transform group-hover:scale-110 duration-300"
                    style={{ backgroundColor: formData.color }}
                  >
                    <span className="drop-shadow-sm filter">{formData.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Select Icon</p>
                    <p className="text-xs text-muted-foreground truncate">Tap to browse available icons</p>
                  </div>
                  <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform duration-300", showIconPicker && "rotate-180 text-primary")} />
                </button>

                {showIconPicker && (
                  <div className="space-y-4 border border-border/60 rounded-2xl p-4 bg-muted/20 animate-in slide-in-from-top-2 duration-200">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search for icons..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 rounded-xl bg-background border-border/50 text-sm font-medium"
                      />
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {ICON_CATEGORIES.map((category) => (
                        <Button
                          key={category.id}
                          type="button"
                          variant={selectedIconCategory === category.id ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setSelectedIconCategory(category.id)}
                          className={cn(
                            "h-7 px-3 text-xs font-bold rounded-lg border",
                            selectedIconCategory === category.id
                              ? "bg-background shadow-sm border-border"
                              : "border-transparent text-muted-foreground hover:bg-background/50"
                          )}
                        >
                          <span className="mr-1.5 opacity-80">{category.emoji}</span> {category.label}
                        </Button>
                      ))}
                    </div>

                    {/* Icon Grid */}
                    <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-1 max-h-[160px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-primary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-primary/50">
                      {Array.isArray(filteredIcons) && filteredIcons.slice(0, 48).map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, icon }))
                            // Don't close picker immediately for better UX
                          }}
                          className={cn(
                            "aspect-square flex items-center justify-center text-xl rounded-xl transition-all hover:scale-110 active:scale-95",
                            formData.icon === icon
                              ? "bg-background border-2 border-primary shadow-sm"
                              : "hover:bg-background/80 hover:shadow-sm border border-transparent"
                          )}
                          title={`Select ${icon}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color Swatches */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 block">Category Color</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 border-2",
                          formData.color === color
                            ? "border-primary shadow-md ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                            : "border-transparent opacity-80 hover:opacity-100"
                        )}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="space-y-3 pt-2 pb-4">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 ml-1">Preview</label>
              <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm border border-black/5"
                  style={{ backgroundColor: formData.color }}
                >
                  <span className="text-white drop-shadow-md">{formData.icon}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg leading-none mb-1">{formData.name || "Category Name"}</h4>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide opacity-80">{formData.type}</p>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-black uppercase tracking-wide border border-primary/20">
                  Active
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>

        {/* Footer - Sticky */}
        <div className="p-6 pt-4 border-t border-border/40 bg-muted/20 shrink-0">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-11 rounded-xl font-bold border-border/60 hover:bg-background hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canCreate}
              className="flex-1 h-11 rounded-xl font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-[0.98]"
            >
              <Check className="w-4 h-4 mr-2" />
              Create Category
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}