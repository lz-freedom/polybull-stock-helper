import * as React from 'react';
import { Plus, Folder, LayoutGrid, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type ChatSidebarProps = React.HTMLAttributes<HTMLDivElement>;

export function ChatSidebar({ className, ...props }: ChatSidebarProps) {
    return (
        <div className={cn('flex h-full w-[280px] flex-col border-r bg-card', className)} {...props}>
            {/* Header */}
            <div className="p-4 pb-2">
                <div className="flex items-center gap-2 mb-6 px-2 text-xl font-bold tracking-tight">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-5 h-5"
                        >
                            <title>Logo</title>
                            <path d="M2 12h20" />
                            <path d="M12 2v20" />
                            <path d="M12 12 2 2" />
                            <path d="m12 12 10 10" />
                        </svg>
                    </div>
                    <span>Surf</span>
                </div>
                <Button className="w-full justify-start gap-2 bg-primary text-primary-foreground shadow-sm transition-all hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98]" size="lg">
                    <Plus className="w-5 h-5" />
                    New Chat
                </Button>
            </div>

            {/* Navigation / Folders */}
            <div className="px-3 py-4">
                <div className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Folders
                </div>
                <nav className="space-y-1">
                    <Button variant="ghost" className="w-full justify-start gap-2 text-sm font-normal text-muted-foreground hover:text-foreground">
                        <LayoutGrid className="w-4 h-4" />
                        All Chats
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-sm font-normal text-muted-foreground hover:text-foreground">
                        <Folder className="w-4 h-4" />
                        Work Projects
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-sm font-normal text-muted-foreground hover:text-foreground">
                        <Folder className="w-4 h-4" />
                        Personal
                    </Button>
                </nav>
            </div>

            {/* History */}
            <div className="flex-1 overflow-auto px-3">
                <div className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Today
                </div>
                <nav className="space-y-1 mb-6">
                    <Button variant="ghost" className="w-full justify-start text-left font-normal h-auto py-2 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <span className="truncate">Analyzing Q3 Performance Data</span>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-left font-normal h-auto py-2 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <span className="truncate">React Component Structure Ideas</span>
                    </Button>
                </nav>

                <div className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Yesterday
                </div>
                <nav className="space-y-1">
                    <Button variant="ghost" className="w-full justify-start text-left font-normal h-auto py-2 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <span className="truncate">Marketing Copy for "Surf"</span>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-left font-normal h-auto py-2 text-muted-foreground hover:text-foreground hover:bg-muted">
                        <span className="truncate">Email Drafts</span>
                    </Button>
                </nav>
            </div>

            {/* Footer / User Profile */}
            <div className="p-4 border-t mt-auto">
                <div className="flex items-center gap-3 w-full p-2 hover:bg-muted rounded-md cursor-pointer transition-colors group">
                    <Avatar className="w-9 h-9 border ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                        <AvatarImage src="/placeholder-user.jpg" alt="@user" />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-info text-primary-foreground">JD</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate text-foreground">John Doe</p>
                        <p className="text-xs text-muted-foreground truncate">Pro Plan</p>
                    </div>
                    <Settings className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>
        </div>
    );
}
