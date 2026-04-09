import React, { useState, useEffect } from 'react';

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState(0); // 0: initial, 1: text appear, 2: subtitle, 3: fade out

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => onComplete(), 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-700 ${
        phase >= 3 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)' }}
    >
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `rgba(${99 + Math.random() * 60}, ${102 + Math.random() * 60}, 241, ${0.3 + Math.random() * 0.4})`,
              animation: `floatParticle ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Glowing Orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)',
          animation: 'pulseOrb 3s ease-in-out infinite',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        }}
      />
      <div className="absolute w-[300px] h-[300px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)',
          animation: 'pulseOrb 4s ease-in-out infinite 0.5s',
          top: '45%', left: '55%', transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Main Content */}
      <div className="relative text-center z-10">
        {/* Logo Icon */}
        <div
          className={`text-6xl mb-6 transition-all duration-1000 ${
            phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
          style={{ filter: 'drop-shadow(0 0 30px rgba(99,102,241,0.5))' }}
        >
          🎟️
        </div>

        {/* Welcome Text */}
        <div
          className={`transition-all duration-1000 ${
            phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-indigo-400 text-lg font-light tracking-[0.4em] uppercase mb-3"
             style={{ textShadow: '0 0 20px rgba(99,102,241,0.3)' }}>
            Welcome to
          </p>
        </div>

        {/* Main Title */}
        <div
          className={`transition-all duration-1000 delay-300 ${
            phase >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-90'
          }`}
        >
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                  style={{ textShadow: '0 0 60px rgba(99,102,241,0.3)' }}>
              EVENT
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              FOUNDATION
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              SYSTEM
            </span>
          </h1>
        </div>

        {/* Decorative Line */}
        <div
          className={`mx-auto mt-6 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent transition-all duration-1000 delay-500 ${
            phase >= 2 ? 'w-64 opacity-100' : 'w-0 opacity-0'
          }`}
        />

        {/* Subtitle */}
        <div
          className={`transition-all duration-700 delay-200 ${
            phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-slate-400 text-sm mt-4 tracking-widest uppercase font-light">
            Enterprise Event Management & Ticketing
          </p>
        </div>

        {/* Loading Dots */}
        <div
          className={`flex justify-center gap-2 mt-8 transition-all duration-500 ${
            phase >= 2 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-500"
              style={{
                animation: 'bounceDot 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-20px) translateX(10px); opacity: 0.7; }
          50% { transform: translateY(-10px) translateX(-5px); opacity: 0.5; }
          75% { transform: translateY(-25px) translateX(15px); opacity: 0.8; }
        }
        @keyframes pulseOrb {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.15; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.25; }
        }
        @keyframes bounceDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
