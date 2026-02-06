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
    Sparkles,
    Users,
} from 'lucide-react';
import inviteFriendsBg from '@/assets/invite-friends-bg.png';
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
    currentTheme: _currentTheme,
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
            {/* Surf Waves Card - The "Upgrade" visual context -> Now Invite Friends */}
            <div
                className="rounded-md border border-border p-0 relative overflow-hidden group hover:border-border/70 transition-colors cursor-pointer h-10 flex items-center"
                style={{
                    backgroundImage: `url(${inviteFriendsBg.src})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundColor: 'var(--card)',
                }}
            >
                <div className="relative z-10 flex items-center gap-2 px-3 w-full">
                    <Users className="h-4 w-4 text-primary-foreground" />
                    <span className="font-medium text-sm text-primary-foreground">{t('inviteFriends')}</span>
                </div>
            </div>

            {/* Upgrade Button Row (if requested by user, or part of menu. User said "point open should contain upgrade", but image showed "Upgrade" button next to name? 
               Looking at the image (uploaded_media_0), there is an "Upgrade" chip NEXT to the user name row. 
               Let's match that layout: User Avatar + Name + Upgrade Chip + Ellipsis 
            */}

            <div className="flex items-center gap-2 pl-1 pr-0">
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-success/10 text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0 shadow-sm">
                    {userInitial}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-semibold truncate text-foreground">{userDisplayName}</span>
                    {/* Pink Upgrade Chip */}
                    <button className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-transparent border border-primary hover:bg-accent shadow-sm text-[10px] font-bold text-primary transition-colors">
                        <Gem className="h-3 w-3" />
                        {t('upgrade')}
                    </button>
                </div>

                {/* More Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-1.5" side="top">
                        {/* Upgrade */}
                        <DropdownMenuItem className="text-primary focus:text-primary focus:bg-accent cursor-pointer flex items-center gap-2">
                            <Sparkles className="mr-2 h-4 w-4" />
                            <span>{t('upgradePlan')}</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Appearance Submenu */}
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
                                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                <span>{t('appearance')}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="ml-2">
                                <DropdownMenuItem onClick={() => onThemeChange('light')}>
                                    <Sun className="mr-2 h-4 w-4" /> {t('light')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onThemeChange('dark')}>
                                    <Moon className="mr-2 h-4 w-4" /> {t('dark')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onThemeChange('system')}>
                                    <Monitor className="mr-2 h-4 w-4" /> {t('system')}
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        {/* Language Submenu */}
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
                                <Languages className="h-4 w-4" />
                                <span>{t('language')}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => onLocaleChange('en')}>English</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onLocaleChange('zh')}>中文</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onLocaleChange('ja')}>日本語</DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        {/* Settings */}
                        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
                            <Settings className="h-4 w-4" />
                            <span>{t('settings')}</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Logout */}
                        <DropdownMenuItem onClick={() => signOut()} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                            <LogOut className="h-4 w-4" />
                            <span>{t('signOut')}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
