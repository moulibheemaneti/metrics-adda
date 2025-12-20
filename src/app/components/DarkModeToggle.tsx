import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check for saved preference or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-lg bg-[var(--neutral-100)] hover:bg-[var(--neutral-200)] transition-all duration-[var(--timing-fast)]"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5">
        <Sun 
          className={`absolute inset-0 text-[var(--neutral-700)] transition-all duration-[var(--timing-normal)] ${
            isDark ? 'rotate-180 opacity-0 scale-0' : 'rotate-0 opacity-100 scale-100'
          }`}
          size={20}
        />
        <Moon 
          className={`absolute inset-0 text-[var(--neutral-700)] transition-all duration-[var(--timing-normal)] ${
            isDark ? 'rotate-0 opacity-100 scale-100' : 'rotate-180 opacity-0 scale-0'
          }`}
          size={20}
        />
      </div>
    </button>
  );
}
