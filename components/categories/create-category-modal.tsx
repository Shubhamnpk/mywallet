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
      <DialogContent className="sm:max-w-sm max-h-[85vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            <DialogTitle className="text-base">New Category</DialogTitle>
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-3">
            {/* Type Pills */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.type === "expense" ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, type: "expense" }))}
                className="flex-1 h-9 text-sm"
                size="sm"
              >
                💸 Expense
              </Button>
              <Button
                type="button"
                variant={formData.type === "income" ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, type: "income" }))}
                className="flex-1 h-9 text-sm"
                size="sm"
              >
                💰 Income
              </Button>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Coffee, Groceries, Salary..."
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="h-9"
                autoFocus
              />
            </div>

            {/* Icon */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Icon</label>
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-full flex items-center gap-3 p-2.5 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: formData.color }}
                >
                  <span className="text-sm text-white">{formData.icon}</span>
                </div>
                <span className="text-sm flex-1 text-left">Choose icon</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", showIconPicker && "rotate-180")} />
              </button>

              {showIconPicker && (
                <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-1">
                    {ICON_CATEGORIES.map((category) => (
                      <Button
                        key={category.id}
                        type="button"
                        variant={selectedIconCategory === category.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedIconCategory(category.id)}
                        className="h-7 px-2 text-xs"
                      >
                        {category.emoji}
                      </Button>
                    ))}
                  </div>

                  {/* Icons */}
                  <div className="grid grid-cols-8 gap-1.5 max-h-24 overflow-y-auto p-1">
                    {Array.isArray(filteredIcons) && filteredIcons.slice(0, 24).map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, icon }))
                          setShowIconPicker(false)
                        }}
                        className={cn(
                          "aspect-square flex items-center justify-center text-sm rounded border transition-all hover:scale-105",
                          formData.icon === icon
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                        title={`Select ${icon}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>

                  {/* Custom */}
                  <Input
                    placeholder="Custom emoji..."
                    value={formData.icon}
                    onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                    className="text-center h-8 text-sm"
                    maxLength={4}
                  />
                </div>
              )}
            </div>

            {/* Colors */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="grid grid-cols-7 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={cn(
                      "w-8 h-8 rounded-lg border-2 transition-all hover:scale-105",
                      formData.color === color
                        ? "border-primary shadow-sm ring-1 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Preview</label>
              <div className="flex items-center gap-2.5 p-2.5 border rounded-lg bg-muted/20">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: formData.color }}
                >
                  <span className="text-white">{formData.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {formData.name || "Category Name"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {formData.type}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 pt-3 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1 h-9" size="sm">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canCreate}
              className="flex-1 h-9"
              size="sm"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}