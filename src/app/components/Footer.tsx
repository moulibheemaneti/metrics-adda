import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#1e293b] text-[#cbd5e1] py-12 border-t border-[#334155]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Tool Categories */}
          <div>
            <h4 className="text-[#e2e8f0] mb-4">Converters</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="hover:text-[#5eead4] transition-colors duration-[var(--timing-fast)]">Length Converter</a>
              </li>
              <li>
                <a href="#" className="hover:text-[#5eead4] transition-colors duration-[var(--timing-fast)]">Weight Converter</a>
              </li>
              <li>
                <a href="#" className="hover:text-[#5eead4] transition-colors duration-[var(--timing-fast)]">Area Converter</a>
              </li>
              <li>
                <a href="#" className="hover:text-[#5eead4] transition-colors duration-[var(--timing-fast)]">Volume Converter</a>
              </li>
            </ul>
          </div>

          {/* Calculators */}
          <div>
            <h4 className="text-[#e2e8f0] mb-4">Calculators</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="hover:text-[#5eead4] transition-colors duration-[var(--timing-fast)]">Percentage Calculator</a>
              </li>
              <li>
                <a href="#" className="hover:text-[#5eead4] transition-colors duration-[var(--timing-fast)]">Discount Calculator</a>
              </li>
              <li>
                <a href="#" className="hover:text-[#5eead4] transition-colors duration-[var(--timing-fast)]">Time Converter</a>
              </li>
            </ul>
          </div>

          {/* Utilities */}
          <div>
            <h4 className="text-[#e2e8f0] mb-4">Utilities</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="hover:text-[#5eead4] transition-colors duration-[var(--timing-fast)]">Text Case Converter</a>
              </li>
              <li>
                <a href="#" className="hover:text-[#5eead4] transition-colors duration-[var(--timing-fast)]">Word Counter</a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[#e2e8f0] mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="hover:text-[#5eead4] transition-colors duration-[var(--timing-fast)]">About MetricsAdda</a>
              </li>
              <li>
                <a href="#" className="hover:text-[#5eead4] transition-colors duration-[var(--timing-fast)]">Contact/Feedback</a>
              </li>
              <li>
                <a href="#" className="hover:text-[#5eead4] transition-colors duration-[var(--timing-fast)]">Privacy Policy</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Links */}
        <div className="flex items-center justify-center space-x-6 mb-8 pt-8 border-t border-[#334155]">
          <a href="#" className="text-[#94a3b8] hover:text-[#5eead4] social-icon-hover" aria-label="Facebook">
            <Facebook size={20} />
          </a>
          <a href="#" className="text-[#94a3b8] hover:text-[#5eead4] social-icon-hover" aria-label="Twitter">
            <Twitter size={20} />
          </a>
          <a href="#" className="text-[#94a3b8] hover:text-[#5eead4] social-icon-hover" aria-label="Instagram">
            <Instagram size={20} />
          </a>
          <a href="#" className="text-[#94a3b8] hover:text-[#5eead4] social-icon-hover" aria-label="LinkedIn">
            <Linkedin size={20} />
          </a>
        </div>

        {/* Closing Line */}
        <div className="text-center text-[#94a3b8]">
          <p>Built for clarity. Designed for speed. Made for you.</p>
        </div>
      </div>
    </footer>
  );
}