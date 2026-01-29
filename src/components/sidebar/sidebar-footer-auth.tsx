'use client';

import { useTranslations } from 'next-intl';
import {
    MoreHorizontal,
    LogOut,
    Settings,
    Languages,
    Sun,
    Moon,
    Monitor,
    Gem,
    Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
// Note: Assuming next-themes or similar is used, usually 'useTheme' hook. 
// If specific theme logic is in app-sidebar, I might need to accept props or move logic here.
// Re-reading app-sidebar.tsx, it implements manual theme logic. I will accept theme props to be safe or replicate logic?
// The original file used local state 'theme' and effect. I should probably lift that or pass it down. 
// For now, I will define the props to accept theme styling handlers.

interface SidebarFooterAuthProps {
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
    collapsed: boolean;
    locale: string;
    onThemeChange: (theme: string) => void;
    onLocaleChange: (locale: string) => void;
    currentTheme: string | undefined;
}

export function SidebarFooterAuth({
    user,
    collapsed,
    onThemeChange,
    onLocaleChange,
    currentTheme
}: SidebarFooterAuthProps) {
    const t = useTranslations('sidebar');

    // Fallbacks
    const userInitial = user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? 'U';
    const userDisplayName = user.name ?? user.email?.split('@')[0] ?? 'User';

    if (collapsed) {
        return (
            <div className="p-2 flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {userInitial}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {/* maybe expand settings? */ }}>
                    <Settings className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="p-3 space-y-3">
            {/* Surf Waves Card - The "Upgrade" visual context */}
            <div className="rounded-xl bg-[#F5F2EE] dark:bg-zinc-900 border border-t-white/50 border-b-black/5 p-3 relative overflow-hidden group hover:border-pink-200/50 transition-colors cursor-pointer">
                {/* Decorative background waves could go here */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/50 dark:bg-white/10 flex items-center justify-center text-orange-400">
                        <span className="text-xl">🌊</span>
                    </div>
                    <div>
                        <div className="font-serif text-sm text-[#8B7E72] dark:text-gray-300">Surf Waves</div>
                        <div className="text-[10px] text-muted-foreground">0 waves available</div>
                    </div>
                </div>
            </div>

            {/* Upgrade Button Row (if requested by user, or part of menu. User said "point open should contain upgrade", but image showed "Upgrade" button next to name? 
               Looking at the image (uploaded_media_0), there is an "Upgrade" chip NEXT to the user name row. 
               Let's match that layout: User Avatar + Name + Upgrade Chip + Ellipsis 
            */}

            <div className="flex items-center gap-2 pl-1 pr-0">
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-green-700 text-white flex items-center justify-center text-xs font-medium shrink-0 shadow-sm">
                    {userInitial}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-semibold truncate text-foreground">{userDisplayName}</span>
                    {/* Pink Upgrade Chip */}
                    <button className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-pink-200 shadow-sm text-[10px] font-bold text-pink-500 hover:bg-pink-50 transition-colors">
                        <Gem className="h-3 w-3" />
                        Upgrade
                    </button>
                </div>

                {/* More Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56" side="top">
                        {/* Upgrade */}
                        <DropdownMenuItem className="text-pink-500 focus:text-pink-600 focus:bg-pink-50">
                            <Sparkles className="mr-2 h-4 w-4" />
                            <span>Upgrade Plan</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Appearance Submenu */}
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                <span className="ml-6">Appearance</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => onThemeChange('light')}>
                                    <Sun className="mr-2 h-4 w-4" /> Light
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onThemeChange('dark')}>
                                    <Moon className="mr-2 h-4 w-4" /> Dark
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onThemeChange('system')}>
                                    <Monitor className="mr-2 h-4 w-4" /> System
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        {/* Language Submenu */}
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Languages className="mr-2 h-4 w-4" />
                                <span>Language</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => onLocaleChange('en')}>English</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onLocaleChange('zh')}>中文</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onLocaleChange('ja')}>日本語</DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        {/* Settings */}
                        <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Logout */}
                        <DropdownMenuItem onClick={() => signOut()}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
