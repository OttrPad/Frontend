import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="relative min-h-svh flex flex-col items-center justify-center p-6 md:p-10 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Modern gradient background */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/90 via-slate-900/70 to-slate-800/90"></div>

      {/* Sophisticated grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }}></div>

      {/* Subtle animated gradients */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/[0.03] rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-500/[0.03] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-emerald-500/[0.02] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>

      {/* Huge OttrPad background text at bottom */}
      <div className="absolute inset-0 flex items-end justify-center select-none pointer-events-none overflow-hidden pb-8">
        <div className="text-center transform scale-200">
          <h1 className="text-[35vw] sm:text-[32vw] md:text-[30vw] lg:text-[28vw] xl:text-[26vw] 2xl:text-[24vw] font-black text-white/[0.04] leading-none tracking-tighter whitespace-nowrap">
            OttrPad
          </h1>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-sm md:max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            OttrPad
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Collaborative Code Editor
          </p>
        </div>

        {/* Glassmorphism login form */}
        <LoginForm />
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-slate-500 text-xs">
          © 2024 OttrPad. Built for developers, by developers.
        </p>
      </div>
    </div>
  );
}
