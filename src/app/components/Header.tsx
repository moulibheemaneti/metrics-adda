import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './Button';
import { DarkModeToggle } from './DarkModeToggle';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`sticky top-0 z-50 bg-[var(--neutral-50)] border-b border-[var(--neutral-200)] transition-all duration-[var(--timing-fast)] ${
        isScrolled ? 'shadow-md' : ''
      }`}
      style={{ animation: 'slideDown 250ms var(--ease-out)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-[var(--blue-gray-800)]">MetricsAdda</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a 
              href="#tools" 
              className="text-[var(--neutral-700)] hover:text-[var(--teal-600)] transition-colors duration-[var(--timing-fast)] relative group"
            >
              Tools
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[var(--teal-600)] group-hover:w-full transition-all duration-[var(--timing-fast)]"></span>
            </a>
            <a 
              href="#features" 
              className="text-[var(--neutral-700)] hover:text-[var(--teal-600)] transition-colors duration-[var(--timing-fast)] relative group"
            >
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[var(--teal-600)] group-hover:w-full transition-all duration-[var(--timing-fast)]"></span>
            </a>
            <a 
              href="#about" 
              className="text-[var(--neutral-700)] hover:text-[var(--teal-600)] transition-colors duration-[var(--timing-fast)] relative group"
            >
              About
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[var(--teal-600)] group-hover:w-full transition-all duration-[var(--timing-fast)]"></span>
            </a>
            <DarkModeToggle />
            <Button variant="secondary">Get Started</Button>
          </nav>

          {/* Mobile menu button and dark mode toggle */}
          <div className="md:hidden flex items-center gap-2">
            <DarkModeToggle />
            <button
              className="p-2 text-[var(--neutral-700)]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden bg-[var(--neutral-50)] border-t border-[var(--neutral-100)]"
          style={{ animation: 'slideInFromRight 250ms var(--ease-smooth)' }}
        >
          <div className="px-4 pt-2 pb-4 space-y-3">
            <a 
              href="#tools" 
              className="block py-2 text-[var(--neutral-700)] hover:text-[var(--teal-600)]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Tools
            </a>
            <a 
              href="#features" 
              className="block py-2 text-[var(--neutral-700)] hover:text-[var(--teal-600)]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <a 
              href="#about" 
              className="block py-2 text-[var(--neutral-700)] hover:text-[var(--teal-600)]"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </a>
            <Button variant="secondary" className="w-full">Get Started</Button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </header>
  );
}