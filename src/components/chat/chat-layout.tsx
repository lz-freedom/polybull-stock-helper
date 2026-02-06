'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { PanelLeftClose, PanelRightClose, Menu, SidebarClose, SidebarOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatLayoutProps {
    sidebar?: React.ReactNode
    toc?: React.ReactNode
    children: React.ReactNode
    className?: string
}

export function ChatLayout({ sidebar, toc, children, className }: ChatLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
    const [isTocOpen, setIsTocOpen] = React.useState(true);

    return (
        <div className={cn('flex h-screen bg-card overflow-hidden w-full', className)}>
            {/* Left Sidebar */}
            <div 
                className={cn(
                    'flex-shrink-0 transition-all duration-300 ease-in-out border-r bg-muted relative z-20',
                    isSidebarOpen ? 'w-[280px]' : 'w-0 border-none opacity-0',
                )}
            >
                <div className="h-full overflow-hidden w-[280px]">
                    {sidebar}
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 relative h-full">
                {/* Toggle Buttons - Floating */}
                <div className="absolute top-4 left-4 z-10">
                    {!isSidebarOpen && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <SidebarOpen className="w-5 h-5" />
                        </Button>
                    )}
                    {isSidebarOpen && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute -left-12 top-0 h-8 w-8 text-muted-foreground hover:text-foreground hidden lg:flex"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <SidebarClose className="w-5 h-5" />
                        </Button>
                    )}
                </div>
            
                <div className="absolute top-4 right-4 z-10 lg:hidden">
                    {toc && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setIsTocOpen(!isTocOpen)}
                        >
                            <Menu className="w-5 h-5" />
                        </Button>
                    )}
                </div>

                {/* Scrollable Area */}
                <div className="flex-1 overflow-y-auto relative scroll-smooth bg-card">
                    {children}
                </div>
            </main>
        
            {/* Right Sidebar (TOC) */}
            {toc && (
                <div 
                    className={cn(
                        'flex-shrink-0 transition-all duration-300 ease-in-out border-l bg-card hidden lg:block',
                        isTocOpen ? 'w-[240px]' : 'w-0 border-none opacity-0',
                    )}
                >
                    <div className="h-full overflow-hidden w-[240px] p-6 pt-20">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contents</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsTocOpen(false)}>
                                <PanelRightClose className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        </div>
                        {toc}
                    </div>
                </div>
            )}
        </div>
    );
}
