"use client";

export function BrandingElements() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* Main mesh gradient */}
      <div className="mesh-gradient-hero absolute inset-0" />

      {/* Floating orbs */}
      <div className="orb orb-violet w-[500px] h-[500px] -top-40 left-1/2 -translate-x-1/2 opacity-15" />
      <div className="orb orb-cyan w-[400px] h-[400px] -top-20 right-[10%] opacity-10" />
      <div className="orb orb-amber w-[300px] h-[300px] top-20 left-[15%] opacity-[0.06]" />

      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 dot-grid opacity-20"
        style={{
          maskImage:
            "radial-gradient(ellipse 70% 50% at 50% 0%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 50% at 50% 0%, black 30%, transparent 100%)",
        }}
      />

      {/* Subtle diagonal lines */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(167, 139, 250, 0.3), rgba(167, 139, 250, 0.3) 1px, transparent 1px, transparent 60px)",
        }}
      />

      {/* Glow line separator at bottom */}
      <div className="absolute bottom-0 left-0 right-0 glow-line-multi" />
    </div>
  );
}
