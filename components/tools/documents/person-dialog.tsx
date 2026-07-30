"use client"

import { useState, useEffect } from "react"
import { User, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  type Person,
  savePerson,
  PERSON_EMOJIS,
  generateId,
} from "@/lib/document-storage"

export function PersonDialog({ open, onOpenChange, editPerson, onSaved }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editPerson: Person | null
  onSaved: () => void
}) {
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState<string>(PERSON_EMOJIS[0])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(editPerson?.name || "")
      setEmoji(editPerson?.emoji || PERSON_EMOJIS[0])
      setIsSaving(false)
    }
  }, [open, editPerson])

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Enter a name"); return }
    setIsSaving(true)
    try {
      const person: Person = {
        id: editPerson?.id || generateId(),
        name: name.trim(),
        emoji,
        createdAt: editPerson?.createdAt || new Date().toISOString(),
      }
      await savePerson(person)
      toast.success(editPerson ? "Person updated" : "Person added")
      await onSaved()
      onOpenChange(false)
    } catch {
      toast.error("Failed to save person")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
            <User className="h-4 w-4" />
            {editPerson ? "Edit Person" : "Add Person"}
          </DialogTitle>
          <DialogDescription className="text-[10px]">
            {editPerson ? "Update the person's details" : "Add a new person to store documents for"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avatar</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PERSON_EMOJIS.map((e, i) => (
                <button key={`emoji-${i}`} onClick={() => setEmoji(e)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border text-lg transition-all",
                    emoji === e ? "border-primary bg-primary/10 shadow-sm" : "border-border/40 hover:border-border/60",
                  )}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John" className="h-9 text-sm" autoFocus />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
            {isSaving ? "Saving..." : editPerson ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
