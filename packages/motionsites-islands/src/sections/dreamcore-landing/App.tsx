import React from 'react';
import { motion } from 'framer-motion';
import { Sparkle } from 'lucide-react'


// Helper component for fade-up animation
const FadeUp = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    viewport={{ once: true }}
  >
    {children}
  </motion.div>
);

// Helper component for slow vertical drift animation
const Drift = ({ children }) => (
  <motion.div
    animate={{ y: [0, -12, 0] }}
    transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
    className="motion-safe:animate-drift" // Tailwind class for reduced motion
  >
    {children}
  </motion.div>
);

const DreamcoreHero = () => {
  return (
    <section className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden font-['Inter'] text-[#F6F2FA]">
      {/* Background Image with Gradient Overlay */}
      <motion.div
        className="absolute inset-0 z-0"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        data-framer-reduced-motion="disabled" // Disable scale animation for reduced motion
      >
        <img
          src="/assets/dreamcore-sky.jpg"
          alt="Dreamy dawn cloudscape with soft lavender and rose hues"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/20" />
      </motion.div>

      {/* Top Navigation */}
      

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-20">
        {/* Floating Column */}
        <div className="absolute bottom-1/4 md:bottom-1/3 lg:bottom-1/4 xl:bottom-1/3 left-1/2 -translate-x-1/2 w-48 md:w-64 lg:w-80 h-auto z-0">
          <Drift>
            <img
              src="/motionsites/sections/assets/001_Interactive-Discovery-base.webp"
              alt="Surreal classical column floating on clouds"
              className="w-full h-full object-contain drop-shadow-lg"
            />
          </Drift>
        </div>

        {/* Text Overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center mt-20 md:mt-0">
          <FadeUp delay={0}>
            <p className="text-lg md:text-xl uppercase tracking-[0.25em] mb-4 drop-shadow-md">
              Enter the Dreamscape
            </p>
          </FadeUp>
          <FadeUp delay={0.15}>
            <h1 className="font-['Cormorant_Garamond'] text-5xl md:text-7xl lg:text-8xl font-light leading-tight mb-6 drop-shadow-lg max-w-4xl">
              Where Reality Blurs
              <br />
              Into Ethereal Visions
            </h1>
          </FadeUp>
          <FadeUp delay={0.3}>
            <p className="text-base md:text-lg mb-8 max-w-xl drop-shadow-md">
              Explore a world beyond the ordinary, where imagination takes flight and dreams become tangible.
            </p>
          </FadeUp>
          <FadeUp delay={0.45}>
            <button className="px-8 py-3 md:px-10 md:py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-lg md:text-xl uppercase tracking-wider hover:bg-white/20 transition-all duration-300 drop-shadow-md">
              Begin Your Journey
            </button>
          </FadeUp>
        </div>
      </div>
    </section>
  );
};

export default DreamcoreHero;
