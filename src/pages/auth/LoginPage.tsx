import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="relative bg-slate-950 flex min-h-svh flex-col items-center justify-center p-6 md:p-10 overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-slate-950 to-black/50 z-0"></div>

      {/* Animated background elements */}
      <div className="absolute inset-0 z-0">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

        {/* Floating code symbols */}
        <div className="absolute top-20 left-10 text-slate-700/30 text-8xl font-mono rotate-12 animate-pulse">
          &lt;/&gt;
        </div>
        <div className="absolute bottom-32 right-16 text-slate-700/30 text-6xl font-mono -rotate-12 animate-pulse delay-1000">
          { }
        </div>
        <div className="absolute top-1/3 right-20 text-slate-700/30 text-7xl font-mono rotate-45 animate-pulse delay-500">
          [ ]
        </div>
        <div className="absolute bottom-20 left-20 text-slate-700/30 text-5xl font-mono -rotate-45 animate-pulse delay-1500">
          ( )
        </div>
      </div>

      {/* Main OttrPad branding text */}
      <div className="absolute inset-0 flex items-center justify-center z-0 select-none">
        <h1 className="text-[20vw] sm:text-[15vw] md:text-[12vw] lg:text-[10vw] xl:text-[8vw] font-black text-slate-800/20 leading-none tracking-tighter">
          OttrPad
        </h1>
      </div>

      {/* Subtle glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl z-0"></div>

      {/* Login form container */}
      <div className="w-full max-w-sm md:max-w-3xl relative z-10">
        <LoginForm />
      </div>
    </div>
  );
}
