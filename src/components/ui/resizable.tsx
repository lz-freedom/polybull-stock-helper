'use client';

import * as React from 'react';
import * as ResizablePrimitive from 'react-resizable-panels';
import { cn } from '@/lib/utils';

const ResizablePanelGroup = ({
    className,
    ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
    <ResizablePrimitive.PanelGroup
        className={cn('flex h-full w-full', className)}
        {...props}
    />
);

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = ({
    className,
    ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle>) => (
    <ResizablePrimitive.PanelResizeHandle
        className={cn(
            'relative flex w-2 items-center justify-center bg-transparent transition-colors',
            'after:absolute after:inset-y-2 after:w-[2px] after:rounded-full after:bg-muted',
            'hover:after:bg-accent-foreground/50',
            className,
        )}
        {...props}
    />
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
