interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const baseStyles = 'px-6 py-3 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantStyles = {
    primary: 'bg-[var(--teal-500)] text-white hover:bg-[var(--teal-600)] active:bg-[var(--teal-700)] focus:ring-[var(--teal-500)]',
    secondary: 'bg-[var(--blue-gray-100)] text-[var(--blue-gray-700)] hover:bg-[var(--blue-gray-200)] active:bg-[var(--blue-gray-300)] focus:ring-[var(--teal-500)]',
    text: 'text-[var(--teal-600)] hover:text-[var(--teal-700)] hover:underline focus:ring-[var(--teal-500)]',
  };

  return (
    <button 
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
