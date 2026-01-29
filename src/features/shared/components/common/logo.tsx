import Image from 'next/image';
import logoImg from '@/assets/logo.png';

interface LogoProps {
    showText?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'light' | 'dark' | 'auto';
    className?: string;
}

const sizeMap = {
    sm: { icon: 24, text: 'text-xl' },
    md: { icon: 32, text: 'text-2xl' },
    lg: { icon: 40, text: 'text-3xl' },
};

export function Logo({ showText = true, size = 'md', variant = 'auto', className = '' }: LogoProps) {
    const { icon, text } = sizeMap[size];

    // Use semantic color that adapts to theme
    const textColor = variant === 'dark'
        ? 'text-white'
        : variant === 'light'
            ? 'text-foreground'
            : 'text-foreground';

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <Image
                src={logoImg}
                alt="iVibeFinance"
                width={icon}
                height={icon}
                priority
            />
            {showText && (
                <span className={`font-bold ${text}`}>
                    <span className="bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">i</span>
                    <span className={textColor}>Vibe</span>
                    <span className="bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">Finance</span>
                </span>
            )}
        </div>
    );
}
