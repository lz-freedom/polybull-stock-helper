import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sparkles, User as UserIcon } from "lucide-react"

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatStreamProps extends React.HTMLAttributes<HTMLDivElement> {
  messages: Message[]
  isThinking?: boolean
}

export function ChatStream({ messages, isThinking, className, ...props }: ChatStreamProps) {
  return (
    <div className={cn("flex flex-col gap-6 pb-32 pt-10", className)} {...props}>
      {messages.map((message) => (
        <div 
            key={message.id} 
            className={cn(
                "flex gap-4 w-full max-w-3xl mx-auto px-4",
                message.role === 'user' ? "justify-end" : "justify-start"
            )}
        >
          {message.role === 'assistant' && (
             <Avatar className="w-8 h-8 border shadow-sm mt-1 shrink-0 bg-white">
                <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                    <Sparkles className="w-4 h-4" />
                </AvatarFallback>
            </Avatar>
          )}

          <div className={cn(
            "relative max-w-[85%] px-5 py-3 text-sm leading-relaxed shadow-sm",
             message.role === 'user' 
                ? "bg-gray-100 text-gray-900 rounded-2xl rounded-tr-sm" 
                : "bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm"
          )}>
            <div className="whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert break-words">
                {message.content}
            </div>
          </div>

          {message.role === 'user' && (
             <Avatar className="w-8 h-8 border shadow-sm mt-1 shrink-0">
                <AvatarImage src="/placeholder-user.jpg" alt="@user" />
                <AvatarFallback className="bg-gray-200 text-gray-500">
                    <UserIcon className="w-4 h-4" />
                </AvatarFallback>
            </Avatar>
          )}
        </div>
      ))}

      {isThinking && (
        <div className="flex gap-4 w-full max-w-3xl mx-auto px-4 justify-start">
             <Avatar className="w-8 h-8 border shadow-sm mt-1 shrink-0 bg-white animate-pulse">
                <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                    <Sparkles className="w-4 h-4" />
                </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce"></div>
            </div>
        </div>
      )}
    </div>
  )
}
