import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Award, Crown, X } from 'lucide-react';

const App = () => {
  const [isMenuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const navLinks = [
    { name: 'Projects', href: '#' },
    { name: 'Studio', href: '#' },
    { name: 'Offerings', href: '#' },
    { name: 'Inquire', href: '#' },
  ];

  const stats = [
    { value: '250+', label: 'Brands Transformed' },
    { value: '95%', label: 'Client Retention' },
    { value: '10+', label: 'Years in the Game' },
  ];

  return (
    <main className="relative min-h-screen w-full bg-black text-white overflow-hidden">
      {/* Background Video */}
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-30"
        src="https://motionsites-media.s3.eu-west-1.amazonaws.com/motionsites-assets/video/abstract-lines-bg.mp4"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Navbar */}
      

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/95 backdrop-blur-sm transition-all duration-500 ${
          isMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 sm:px-10 lg:px-16 lg:py-7">
          <div className="font-podium text-2xl font-bold uppercase tracking-wider text-white sm:text-3xl">
            VANGUARD
          </div>
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="flex h-[calc(100%-80px)] flex-col items-center justify-center space-y-8">
          {navLinks.map((link, i) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="font-podium text-4xl uppercase text-white sm:text-5xl"
              style={{
                opacity: isMenuOpen ? 1 : 0,
                transform: isMenuOpen ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.5s ease-out ${
                  i * 0.08 + 0.1
                }s, transform 0.5s ease-out ${i * 0.08 + 0.1}s`,
              }}
            >
              {link.name}
            </a>
          ))}
          <a
            href="#"
            onClick={() => setMenuOpen(false)}
            className="group mt-10 flex items-center space-x-2 rounded-full border border-white/30 px-6 py-3 text-xs uppercase tracking-widest text-white transition-all duration-300 hover:border-white/60 hover:bg-white/10"
            style={{
              opacity: isMenuOpen ? 1 : 0,
              transform: isMenuOpen ? 'translateY(0)' : 'translateY(20px)',
              transition: `opacity 0.5s ease-out ${
                navLinks.length * 0.08 + 0.1
              }s, transform 0.5s ease-out ${navLinks.length * 0.08 + 0.1}s`,
            }}
          >
            <span>Get In Touch</span>
            <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>

      {/* Hero Content */}
      <section className="relative z-10 flex min-h-[calc(100vh-80px)] items-center px-6 pb-10 sm:px-10 lg:px-16">
        <div className="max-w-4xl">
          {/* Tagline */}
          <p className="animate-fade-up mb-6 flex items-center gap-2 font-inter text-xs uppercase tracking-[0.3em] text-white/70 lg:mb-8">
            <Crown className="h-4 w-4 text-white/70" />
            World-Class Digital Collective
          </p>

          {/* Main Heading */}
          <h1 className="font-podium text-[clamp(2.8rem,8vw,7rem)] animate-fade-up-delay-1 leading-[0.92] tracking-tight text-white">
            Design.
            <br />
            Disrupt.
            <br />
            Conquer.
          </h1>

          {/* Subtext */}
          <p className="animate-fade-up-delay-2 mt-6 max-w-md font-inter text-sm leading-relaxed text-white/70 sm:text-base lg:mt-8">
            We build fierce brand identities
            <br />
            that don't just turn heads -- <strong className="text-white">they lead.</strong>
          </p>

          {/* CTA Row */}
          <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap items-center gap-4 sm:gap-6 lg:mt-10">
            <a
              href="#"
              className="group flex items-center space-x-2 rounded-full bg-black px-5 py-3 text-[11px] uppercase tracking-widest text-white transition-colors duration-300 hover:bg-neutral-900 sm:px-7 sm:py-4 sm:text-xs"
            >
              <span>See Our Work</span>
              <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <div className="hidden sm:flex items-center gap-3">
              <Award className="h-8 w-8 text-white/50" />
              <div>
                <p className="font-inter text-xs uppercase tracking-wider text-white/60">
                  Top-Rated
                </p>
                <p className="font-inter text-xs uppercase tracking-wider text-white/60">
                  Brand Studio
                </p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="animate-fade-up-delay-4 mt-8 flex flex-wrap gap-6 sm:mt-10 sm:gap-12 lg:mt-14 lg:gap-16">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-inter text-2xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-1 font-inter text-[9px] uppercase tracking-widest text-white/50 sm:text-xs">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default App;
