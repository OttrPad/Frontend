import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="relative min-h-svh flex flex-col items-center justify-center p-6 md:p-10 overflow-hidden bg-gradient-to-br from-black via-gray-900 to-orange-950">
      {/* Modern gradient background */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/95 via-gray-900/80 to-orange-950/90"></div>

      {/* Sophisticated grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }}></div>

      {/* Subtle animated gradients */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-orange-400/[0.08] rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-400/[0.06] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-orange-300/[0.05] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>

      {/* Huge OttrPad background text at bottom */}
      <div className="absolute inset-0 flex items-end justify-center select-none pointer-events-none overflow-hidden pb-8">
        <div className="text-center transform scale-150">
          <h1 className="text-[28vw] sm:text-[25vw] md:text-[22vw] lg:text-[20vw] xl:text-[18vw] 2xl:text-[16vw] font-black text-orange-400/[0.09] leading-none tracking-tighter whitespace-nowrap">
            OttrPad
          </h1>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-sm md:max-w-4xl">
        {/* Glassmorphism login form */}
        <LoginForm />
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-orange-300/70 text-xs">
          © 2024 OttrPad. Built for developers, by developers.
        </p>
      </div>
    </div>
  );
}
