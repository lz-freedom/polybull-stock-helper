import * as React from "react"
import { Paperclip, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FloatingInputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit?: () => void
}

export function FloatingInput({ className, value, onChange, onSubmit, ...props }: FloatingInputProps) {
  // Simple auto-resize logic could be added here, but keeping it simple for now
  
  return (
    <div className={cn("w-full max-w-2xl mx-auto px-4 pb-6", className)} {...props}>
      <div className="relative flex items-end gap-2 p-2 bg-white rounded-[2rem] shadow-2xl border border-gray-100 ring-1 ring-gray-900/5 transition-shadow hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.12)]">
         <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground hover:bg-gray-100 hover:text-foreground shrink-0 transition-colors">
            <Paperclip className="w-5 h-5" />
            <span className="sr-only">Attach file</span>
         </Button>

         <div className="flex-1 py-3">
            <textarea
                className="w-full bg-transparent border-0 focus:ring-0 p-0 text-base placeholder:text-muted-foreground/70 resize-none max-h-32 overflow-y-auto min-h-[24px] leading-relaxed scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent outline-none"
                placeholder="Message Surf..."
                rows={1}
                value={value}
                onChange={onChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onSubmit?.()
                  }
                }}
            />
         </div>

         <Button 
            size="icon" 
            className="rounded-full bg-pink-600 hover:bg-pink-700 text-white shadow-md h-10 w-10 shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            onClick={onSubmit}
         >
            <ArrowUp className="w-5 h-5" />
            <span className="sr-only">Send message</span>
         </Button>
      </div>
       <div className="text-center mt-3">
            <p className="text-[10px] text-muted-foreground/50 font-medium tracking-wide">
                AI can make mistakes. Check important info.
            </p>
       </div>
    </div>
  )
}
