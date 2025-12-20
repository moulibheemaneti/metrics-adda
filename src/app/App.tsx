import { 
  Zap, 
  Smartphone, 
  CheckCircle, 
  GraduationCap, 
  Briefcase, 
  Users,
  Ruler,
  Scale,
  Percent,
  Square,
  Box,
  Tag,
  Clock,
  Type
} from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Button } from './components/Button';
import { AnimatedSection } from './components/AnimatedSection';

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--neutral-50)] transition-colors duration-[var(--timing-normal)]">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-[var(--neutral-50)] py-16 md:py-24 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 opacity-30 dark:opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-teal-50 to-purple-100 dark:from-blue-900/20 dark:via-teal-900/20 dark:to-purple-900/20 animate-gradient"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 
                className="text-4xl md:text-5xl lg:text-6xl text-[var(--blue-gray-900)] mb-6 fadeInUp delay-100"
                style={{ opacity: 0 }}
              >
                Fast, Clean Utility Tools That Just Work
              </h1>
              <p 
                className="text-lg md:text-xl text-[var(--neutral-600)] mb-8 fadeInUp delay-200"
                style={{ opacity: 0 }}
              >
                No clutter. No ads. Just instant conversions and calculations—built for students, professionals, and anyone who values their time.
              </p>
              
              <div 
                className="flex flex-col sm:flex-row gap-4 mb-8 fadeInScaleBounce delay-300"
                style={{ opacity: 0 }}
              >
                <Button variant="primary" className="btn-hover">Explore Tools</Button>
                <Button variant="secondary">Try Length Converter</Button>
              </div>

              {/* Trust Badge */}
              <div 
                className="inline-block bg-[var(--teal-50)] border border-[var(--teal-200)] text-[var(--teal-700)] px-6 py-3 rounded-lg fadeIn delay-400"
                style={{ opacity: 0 }}
              >
                100% Free • No Sign-Up Required
              </div>
            </div>

            {/* Visual Mockup */}
            <div 
              className="bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-2xl p-4 sm:p-8 shadow-lg slideInLeft delay-200 float"
            >
              <div className="bg-[var(--neutral-50)] rounded-lg p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[var(--blue-gray-800)]">Length Converter</h3>
                  <div className="w-8 h-8 bg-[var(--teal-500)] rounded-full flex items-center justify-center flex-shrink-0">
                    <Ruler className="text-white" size={16} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[var(--neutral-600)] mb-2">From</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="100" 
                        className="flex-1 min-w-0 px-3 sm:px-4 py-2 bg-[var(--neutral-50)] border border-[var(--neutral-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--teal-500)]"
                        defaultValue="100"
                      />
                      <select className="px-2 sm:px-4 py-2 bg-[var(--neutral-50)] border border-[var(--neutral-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--teal-500)] min-w-0">
                        <option>Meters</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--neutral-600)] mb-2">To</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="328.08" 
                        className="flex-1 min-w-0 px-3 sm:px-4 py-2 bg-[var(--teal-50)] border border-[var(--teal-200)] rounded-lg focus:outline-none"
                        defaultValue="328.08"
                        readOnly
                      />
                      <select className="px-2 sm:px-4 py-2 bg-[var(--neutral-50)] border border-[var(--neutral-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--teal-500)] min-w-0">
                        <option>Feet</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="bg-[var(--neutral-50)] py-16 md:py-24">
        <AnimatedSection className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl text-[var(--blue-gray-800)] mb-8">
            Tired of Slow, Cluttered Conversion Tools?
          </h2>
          
          <div className="space-y-4 text-left max-w-2xl mx-auto mb-8">
            <AnimatedSection animation="slideInRight" delay={0}>
              <div className="flex items-start gap-3">
                <span className="text-[var(--neutral-400)] mt-1">•</span>
                <p className="text-lg text-[var(--neutral-700)]">
                  Most tools bury you in ads and pop-ups
                </p>
              </div>
            </AnimatedSection>
            <AnimatedSection animation="slideInRight" delay={50}>
              <div className="flex items-start gap-3">
                <span className="text-[var(--neutral-400)] mt-1">•</span>
                <p className="text-lg text-[var(--neutral-700)]">
                  Confusing interfaces waste your time
                </p>
              </div>
            </AnimatedSection>
            <AnimatedSection animation="slideInRight" delay={100}>
              <div className="flex items-start gap-3">
                <span className="text-[var(--neutral-400)] mt-1">•</span>
                <p className="text-lg text-[var(--neutral-700)]">
                  Mobile experiences that feel like desktop afterthoughts
                </p>
              </div>
            </AnimatedSection>
          </div>

          <p className="text-xl text-[var(--teal-600)]">
            MetricsAdda strips away the noise so you can get answers instantly.
          </p>
        </AnimatedSection>
      </section>

      {/* Value Proposition */}
      <section id="features" className="bg-[var(--neutral-50)] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl text-[var(--blue-gray-900)] text-center mb-16">
              Built for Speed, Designed for Clarity
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Instant Results */}
            <AnimatedSection delay={0}>
              <div className="text-center">
                <div className="w-16 h-16 bg-[var(--teal-50)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="text-[var(--teal-600)]" size={32} />
                </div>
                <h3 className="text-[var(--blue-gray-800)] mb-3">Instant Results</h3>
                <p className="text-[var(--neutral-600)]">
                  Real-time conversions as you type—no submit buttons
                </p>
              </div>
            </AnimatedSection>

            {/* Mobile-First */}
            <AnimatedSection delay={100}>
              <div className="text-center">
                <div className="w-16 h-16 bg-[var(--teal-50)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="text-[var(--teal-600)]" size={32} />
                </div>
                <h3 className="text-[var(--blue-gray-800)] mb-3">Mobile-First</h3>
                <p className="text-[var(--neutral-600)]">
                  Clean interfaces that work perfectly on any device
                </p>
              </div>
            </AnimatedSection>

            {/* Accurate & Reliable */}
            <AnimatedSection delay={200}>
              <div className="text-center">
                <div className="w-16 h-16 bg-[var(--teal-50)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-[var(--teal-600)]" size={32} />
                </div>
                <h3 className="text-[var(--blue-gray-800)] mb-3">Accurate & Reliable</h3>
                <p className="text-[var(--neutral-600)]">
                  Trusted calculations you can count on for homework, work, or everyday tasks
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-[var(--neutral-50)] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl text-[var(--blue-gray-900)] text-center mb-16">
              Who Uses MetricsAdda?
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Students */}
            <AnimatedSection delay={0}>
              <div className="bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-xl p-6 card-hover">
                <div className="w-12 h-12 bg-[var(--teal-500)] rounded-lg flex items-center justify-center mb-4">
                  <GraduationCap className="text-white" size={24} />
                </div>
                <h3 className="text-[var(--blue-gray-800)] mb-3">Students</h3>
                <p className="text-[var(--neutral-600)]">
                  Quick conversions for assignments, exams, and projects—without distractions.
                </p>
              </div>
            </AnimatedSection>

            {/* Professionals */}
            <AnimatedSection delay={100}>
              <div className="bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-xl p-6 card-hover">
                <div className="w-12 h-12 bg-[var(--teal-500)] rounded-lg flex items-center justify-center mb-4">
                  <Briefcase className="text-white" size={24} />
                </div>
                <h3 className="text-[var(--blue-gray-800)] mb-3">Professionals</h3>
                <p className="text-[var(--neutral-600)]">
                  Lightweight tools for engineers, analysts, and anyone who needs accurate answers fast.
                </p>
              </div>
            </AnimatedSection>

            {/* Everyday Users */}
            <AnimatedSection delay={200}>
              <div className="bg-[var(--neutral-100)] border border-[var(--neutral-200)] rounded-xl p-6 card-hover">
                <div className="w-12 h-12 bg-[var(--teal-500)] rounded-lg flex items-center justify-center mb-4">
                  <Users className="text-white" size={24} />
                </div>
                <h3 className="text-[var(--blue-gray-800)] mb-3">Everyday Users</h3>
                <p className="text-[var(--neutral-600)]">
                  Simple reference for measurements, calculations.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Tool Showcase */}
      <section id="tools" className="bg-[var(--neutral-50)] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl text-[var(--blue-gray-900)] text-center mb-16">
            One Tool, One Job—Done Right
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Length Converter */}
            <ToolCard
              icon={<Ruler className="text-[var(--teal-500)]" size={24} />}
              title="Length Converter"
              description="Convert between meters, feet, inches, and more"
            />

            {/* Weight Converter */}
            <ToolCard
              icon={<Scale className="text-[var(--teal-500)]" size={24} />}
              title="Weight Converter"
              description="Easily convert kilograms, pounds, and ounces"
            />

            {/* Percentage Calculator */}
            <ToolCard
              icon={<Percent className="text-[var(--teal-500)]" size={24} />}
              title="Percentage Calculator"
              description="Calculate percentages and proportions instantly"
            />

            {/* Area Converter */}
            <ToolCard
              icon={<Square className="text-[var(--teal-500)]" size={24} />}
              title="Area Converter"
              description="Convert square meters, acres, and more"
            />

            {/* Volume Converter */}
            <ToolCard
              icon={<Box className="text-[var(--teal-500)]" size={24} />}
              title="Volume Converter"
              description="Convert liters, gallons, and cubic units"
            />

            {/* Discount Calculator */}
            <ToolCard
              icon={<Tag className="text-[var(--teal-500)]" size={24} />}
              title="Discount Calculator"
              description="Calculate sale prices and savings quickly"
            />

            {/* Time Converter */}
            <ToolCard
              icon={<Clock className="text-[var(--teal-500)]" size={24} />}
              title="Time Converter"
              description="Convert between hours, minutes, and seconds"
            />

            {/* Text Case Converter */}
            <ToolCard
              icon={<Type className="text-[var(--teal-500)]" size={24} />}
              title="Text Case Converter"
              description="Change text to uppercase, lowercase, and more"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[var(--neutral-50)] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl text-[var(--blue-gray-900)] mb-16">
              Three Steps. Zero Complexity.
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <AnimatedSection delay={0}>
              <div>
                <div className="text-6xl text-[var(--teal-500)] mb-4 number-bounce">1</div>
                <p className="text-lg text-[var(--neutral-700)]">Choose your tool</p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={150}>
              <div>
                <div className="text-6xl text-[var(--teal-500)] mb-4 number-bounce" style={{ animationDelay: '150ms' }}>2</div>
                <p className="text-lg text-[var(--neutral-700)]">Enter your value</p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={300}>
              <div>
                <div className="text-6xl text-[var(--teal-500)] mb-4 number-bounce" style={{ animationDelay: '300ms' }}>3</div>
                <p className="text-lg text-[var(--neutral-700)]">Get instant results</p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Comparison Block */}
      <section className="bg-[var(--blue-gray-50)] py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl text-[var(--blue-gray-900)] text-center mb-12">
              Why MetricsAdda vs. Other Tools?
            </h2>
          </AnimatedSection>

          <AnimatedSection animation="fadeInScale" delay={100}>
            <div className="bg-[var(--neutral-50)] rounded-xl overflow-hidden border border-[var(--neutral-200)]">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--neutral-100)] border-b border-[var(--neutral-200)]">
                    <th className="py-4 px-6 text-left text-[var(--blue-gray-800)]">Other Tools</th>
                    <th className="py-4 px-6 text-left text-[var(--blue-gray-800)]">MetricsAdda</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--neutral-200)]">
                    <td className="py-4 px-6 text-[var(--neutral-500)]">Ad-heavy pages</td>
                    <td className="py-4 px-6 text-[var(--teal-600)] flex items-center gap-2">
                      <CheckCircle size={20} className="text-[var(--teal-500)]" />
                      Clean, ad-free experience
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--neutral-200)]">
                    <td className="py-4 px-6 text-[var(--neutral-500)]">Slow load times</td>
                    <td className="py-4 px-6 text-[var(--teal-600)] flex items-center gap-2">
                      <CheckCircle size={20} className="text-[var(--teal-500)]" />
                      Instant results
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--neutral-200)]">
                    <td className="py-4 px-6 text-[var(--neutral-500)]">Confusing layouts</td>
                    <td className="py-4 px-6 text-[var(--teal-600)] flex items-center gap-2">
                      <CheckCircle size={20} className="text-[var(--teal-500)]" />
                      Mobile-first simplicity
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 text-[var(--neutral-500)]">Questionable accuracy</td>
                    <td className="py-4 px-6 text-[var(--teal-600)] flex items-center gap-2">
                      <CheckCircle size={20} className="text-[var(--teal-500)]" />
                      Verified calculations
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[var(--teal-600)] dark:bg-[var(--teal-100)] py-16 md:py-24 relative overflow-hidden">
        {/* Dark mode overlay */}
        {/* <div className="absolute inset-0 bg-[var(--blue-gray-100)] opacity-0 transition-opacity duration-[var(--timing-normal)]"></div> */}
        
        <AnimatedSection animation="fadeInScale" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl text-white mb-4 fadeInUp delay-100" style={{ opacity: 0 }}>
            Ready to Get Your Answer?
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-8 fadeIn delay-200" style={{ opacity: 0 }}>
            No sign-up. No downloads. Just pick a tool and start converting.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center fadeInUp delay-300" style={{ opacity: 0 }}>
            <button className="px-8 py-4 bg-white text-[var(--teal-600)] rounded-lg hover:scale-105 transition-all duration-[var(--timing-fast)] btn-hover shadow-lg">
              Explore All Tools
            </button>
            <button className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-lg hover:bg-white/20 hover:border-white/50 transition-all duration-[var(--timing-fast)] btn-hover">
              Bookmark MetricsAdda
            </button>
          </div>
        </AnimatedSection>
      </section>

      <Footer />
    </div>
  );
}

// Tool Card Component
interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function ToolCard({ icon, title, description }: ToolCardProps) {
  return (
    <a href="#" className="block bg-[var(--neutral-50)] border border-[var(--neutral-200)] rounded-xl p-6 card-hover no-underline">
      <div className="mb-4">{icon}</div>
      <h3 className="text-[var(--blue-gray-800)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--neutral-600)] mb-4">{description}</p>
      <span className="text-[var(--teal-600)] inline-flex items-center gap-1">
        Use Tool →
      </span>
    </a>
  );
}