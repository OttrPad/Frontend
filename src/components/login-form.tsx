import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNavigate } from "react-router-dom"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically handle authentication
    // For now, we'll just navigate to the join page
    navigate("/join");
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 bg-black/20 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ring-1 ring-orange-400/10">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-8 md:p-10">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold text-white">Welcome back</h1>
                <p className="text-orange-100/80 text-balance mt-2">
                  Sign in to your OttrPad workspace
                </p>
              </div>
              <div className="grid gap-4">
                <Label htmlFor="email" className="text-white font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                  className="bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white placeholder:text-white/50 focus:border-orange-400/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-orange-400/20 transition-all"
                />
              </div>
              <div className="grid gap-4">
                <div className="flex items-center">
                  <Label htmlFor="password" className="text-white font-medium">Password</Label>
                  <a
                    href="#"
                    className="ml-auto text-sm text-orange-200 hover:text-orange-100 underline-offset-2 hover:underline transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  className="bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white placeholder:text-white/50 focus:border-orange-400/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-orange-400/20 transition-all"
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-black hover:from-orange-300 hover:to-orange-400 font-medium py-2.5 shadow-lg hover:shadow-xl transition-all duration-200">
                Sign in
              </Button>
              <div className="relative text-center text-sm">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.08]"></div>
                </div>
                <span className="bg-transparent text-white/60 relative px-4">
                  Or continue with
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Button variant="outline" type="button" className="w-full bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="sr-only">Login with Apple</span>
                </Button>
                <Button variant="outline" type="button" className="w-full bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="sr-only">Login with Google</span>
                </Button>
                <Button variant="outline" type="button" className="w-full bg-white/[0.05] backdrop-blur-md border-white/[0.1] text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4">
                    <path
                      d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 2.17-.38 3.93-.85 3.93-.47 0-.85-1.76-.85-3.93s.38-3.93.85-3.93.85 1.76.85 3.93z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="sr-only">Login with GitHub</span>
                </Button>
              </div>
              <div className="text-center text-sm">
                <span className="text-white/50">Don&apos;t have an account?</span>{" "}
                <a href="#" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors font-medium">
                  Sign up
                </a>
              </div>
            </div>
          </form>
          <div className="relative hidden md:block bg-gradient-to-br from-white/[0.03] to-white/[0.01] backdrop-blur-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-gray-900/30"></div>

            {/* Animated light rays */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-orange-400/20 via-transparent to-transparent transform rotate-12 animate-pulse"></div>
              <div className="absolute top-0 right-1/4 w-1 h-full bg-gradient-to-b from-white/10 via-transparent to-transparent transform -rotate-12 animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Floating particles */}
            <div className="absolute inset-0">
              <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-orange-400/30 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
              <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
              <div className="absolute top-1/2 left-1/5 w-1.5 h-1.5 bg-orange-300/25 rounded-full animate-bounce" style={{ animationDelay: '2s', animationDuration: '5s' }}></div>
            </div>

            {/* Slideshow Container */}
            <div className="relative h-full flex items-center justify-center p-8">
              <div className="slideshow-container w-full">
                {/* Slide 1 */}
                <div className="slide slide-1 text-center space-y-6 opacity-100 absolute inset-0 flex flex-col items-center justify-center p-8">
                  <div className="w-16 h-16 bg-white/[0.08] backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center border border-white/[0.12] shadow-xl transform hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white animate-fade-in">
                      Lightning Fast
                    </h3>
                    <p className="text-orange-100/90 text-sm leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
                      Instant setup, real-time sync. Start coding in seconds, collaborate without limits.
                    </p>
                  </div>
                  <div className="flex items-center justify-center space-x-1 text-orange-300/80 text-xs animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    <span>Zero setup time</span>
                  </div>
                </div>

                {/* Slide 2 */}
                <div className="slide slide-2 text-center space-y-6 opacity-0 absolute inset-0 flex flex-col items-center justify-center p-8">
                  <div className="w-16 h-16 bg-white/[0.08] backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center border border-white/[0.12] shadow-xl transform hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">
                      Learn & Teach
                    </h3>
                    <p className="text-orange-100/90 text-sm leading-relaxed">
                      Perfect for education. Share knowledge, mentor students, build together.
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
                    <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">
                      Rapid Prototyping
                    </h3>
                    <p className="text-orange-100/90 text-sm leading-relaxed">
                      From idea to MVP in minutes. Test concepts, iterate quickly, launch faster.
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
        <a href="#" className="text-white/60 hover:text-orange-400 underline underline-offset-4 transition-colors">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="text-white/60 hover:text-orange-400 underline underline-offset-4 transition-colors">
          Privacy Policy
        </a>
        .
      </div>
    </div>
  )
}
