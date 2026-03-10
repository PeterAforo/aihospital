interface PatientAvatarProps {
  photoUrl?: string | null;
  firstName: string;
  lastName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: { container: 'w-7 h-7', text: 'text-[10px]', icon: 'w-3.5 h-3.5' },
  sm: { container: 'w-9 h-9', text: 'text-xs', icon: 'w-4 h-4' },
  md: { container: 'w-11 h-11', text: 'text-sm', icon: 'w-5 h-5' },
  lg: { container: 'w-16 h-16', text: 'text-lg', icon: 'w-7 h-7' },
  xl: { container: 'w-24 h-24', text: 'text-2xl', icon: 'w-10 h-10' },
};

export default function PatientAvatar({ photoUrl, firstName, lastName, size = 'sm', className = '' }: PatientAvatarProps) {
  const s = sizeMap[size];
  const initials = `${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase();

  return (
    <div
      className={`${s.container} rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0 ${className}`}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={`${firstName} ${lastName}`} className="w-full h-full object-cover" />
      ) : (
        <span className={`${s.text} font-semibold text-white leading-none`}>{initials}</span>
      )}
    </div>
  );
}
