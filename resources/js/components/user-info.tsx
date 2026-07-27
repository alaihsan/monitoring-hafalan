import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';

export function UserInfo({ user, showEmail = false }: { user?: User | null; showEmail?: boolean }) {
    const getInitials = useInitials();
    const name = user?.name || 'Pengguna / Guru';
    const email = user?.email || '';

    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                {user?.avatar && <AvatarImage src={user.avatar} alt={name} />}
                <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                    {getInitials(name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                {showEmail && email && <span className="text-muted-foreground truncate text-xs">{email}</span>}
            </div>
        </>
    );
}
