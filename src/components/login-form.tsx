import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import supabase from "../lib/supabaseClient.tsx";
import { toast } from "react-toastify";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/join`, // Optional: specify redirect URL
        },
      });

      if (error) {
        console.error("Error with Google login:", error.message);
        toast.error(error.message);
      } else {
        toast.success("Redirecting to Google...");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Something went wrong with Google login.");
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 bg-black/20 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ring-1 ring-orange-400/10">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-8 md:p-10 md:py-40">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold text-white">Welcome back</h1>
                <p className="text-orange-100/80 text-balance mt-2">
                  Sign in to your OttrPad workspace
                </p>
              </div>
              <div className="grid gap-4">
                <Button
                  variant="outline"
                  type="button"
                  className="w-full bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white  hover:bg-white/[0.05] hover:text-white hover:border-primary transition-all duration-200 py-3 gap-3"
                  onClick={handleGoogleLogin}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  className="w-full bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white hover:bg-white/[0.05] hover:text-white hover:border-primary transition-all duration-200 py-3 gap-3"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="currentColor"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Continue with GitHub
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  className="w-full bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white hover:bg-white/[0.05] hover:text-white hover:border-primary transition-all duration-200 py-3 gap-3"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                  >
                    <defs>
                      <linearGradient
                        id="meta-gradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#1877F2" />
                        <stop offset="100%" stopColor="#42A5F5" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                      fill="url(#meta-gradient)"
                    />
                  </svg>
                  Continue with Meta
                </Button>
              </div>
            </div>
          </form>
          <div className="relative hidden md:block bg-gradient-to-br from-white/[0.03] to-white/[0.01] backdrop-blur-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-gray-900/30"></div>

            {/* Animated light rays */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-orange-400/20 via-transparent to-transparent transform rotate-12 animate-pulse"></div>
              <div
                className="absolute top-0 right-1/4 w-1 h-full bg-gradient-to-b from-white/10 via-transparent to-transparent transform -rotate-12 animate-pulse"
                style={{ animationDelay: "1s" }}
              ></div>
            </div>

            {/* Floating particles */}
            <div className="absolute inset-0">
              <div
                className="absolute top-1/4 left-1/3 w-2 h-2 bg-orange-400/30 rounded-full animate-bounce"
                style={{ animationDelay: "0s", animationDuration: "3s" }}
              ></div>
              <div
                className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/40 rounded-full animate-bounce"
                style={{ animationDelay: "1s", animationDuration: "4s" }}
              ></div>
              <div
                className="absolute top-1/2 left-1/5 w-1.5 h-1.5 bg-orange-300/25 rounded-full animate-bounce"
                style={{ animationDelay: "2s", animationDuration: "5s" }}
              ></div>
            </div>

            {/* Slideshow Container */}
            <div className="relative h-full flex items-center justify-center p-8">
              <div className="slideshow-container w-full">
                {/* Slide 1 */}
                <div className="slide slide-1 text-center space-y-6 opacity-100 absolute inset-0 flex flex-col items-center justify-center p-8">
                  <div className="w-16 h-16 bg-white/[0.08] backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center border border-white/[0.12] shadow-xl transform hover:scale-110 transition-transform duration-300">
                    <svg
                      className="w-8 h-8 text-orange-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white animate-fade-in">
                      Lightning Fast
                    </h3>
                    <p
                      className="text-orange-100/90 text-sm leading-relaxed animate-fade-in"
                      style={{ animationDelay: "0.2s" }}
                    >
                      Instant setup, real-time sync. Start coding in seconds,
                      collaborate without limits.
                    </p>
                  </div>
                  <div
                    className="flex items-center justify-center space-x-1 text-orange-300/80 text-xs animate-fade-in"
                    style={{ animationDelay: "0.4s" }}
                  >
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    <span>Zero setup time</span>
                  </div>
                </div>

                {/* Slide 2 */}
                <div className="slide slide-2 text-center space-y-6 opacity-0 absolute inset-0 flex flex-col items-center justify-center p-8">
                  <div className="w-16 h-16 bg-white/[0.08] backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center border border-white/[0.12] shadow-xl transform hover:scale-110 transition-transform duration-300">
                    <svg
                      className="w-8 h-8 text-orange-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">
                      Learn & Teach
                    </h3>
                    <p className="text-orange-100/90 text-sm leading-relaxed">
                      Perfect for education. Share knowledge, mentor students,
                      build together.
                    </p>
                  </div>
                  <div className="flex items-center justify-center space-x-1 text-orange-300/80 text-xs">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    <span>Educational friendly</span>
                  </div>
                </div>

                {/* Slide 3 */}
                <div className="slide slide-3 text-center space-y-6 opacity-0 absolute inset-0 flex flex-col items-center justify-center p-8">
                  <div className="w-16 h-16 bg-white/[0.08] backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center border border-white/[0.12] shadow-xl transform hover:scale-110 transition-transform duration-300">
                    <svg
                      className="w-8 h-8 text-orange-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                      />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">
                      Rapid Prototyping
                    </h3>
                    <p className="text-orange-100/90 text-sm leading-relaxed">
                      From idea to MVP in minutes. Test concepts, iterate
                      quickly, launch faster.
                    </p>
                  </div>
                  <div className="flex items-center justify-center space-x-1 text-orange-300/80 text-xs">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    <span>Startup ready</span>
                  </div>
                </div>
              </div>

              {/* Slide indicators */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                <div className="indicator indicator-1 w-2 h-2 bg-orange-400 rounded-full opacity-100 transition-opacity duration-300"></div>
                <div className="indicator indicator-2 w-2 h-2 bg-white/30 rounded-full opacity-50 transition-opacity duration-300"></div>
                <div className="indicator indicator-3 w-2 h-2 bg-white/30 rounded-full opacity-50 transition-opacity duration-300"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="text-white/40 text-center text-xs text-balance">
        By signing in, you agree to our{" "}
        <a
          href="#"
          className="text-white/60 hover:text-orange-400 underline underline-offset-4 transition-colors"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="#"
          className="text-white/60 hover:text-orange-400 underline underline-offset-4 transition-colors"
        >
          Privacy Policy
        </a>
        .
      </div>
    </div>
  );
}
