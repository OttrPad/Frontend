import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
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
          <div className="relative hidden md:block bg-gradient-to-br from-white/[0.03] to-white/[0.01] backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-gray-900/30"></div>
            <div className="relative h-full flex items-center justify-center p-8">
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-white/[0.05] backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center border border-white/[0.08] shadow-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Ideas to reality, instantly
                  </h3>
                  <p className="text-orange-100/90 text-sm leading-relaxed">
                    Perfect for hobbyists, educators, and quick prototyping.
                    Brainstorm, code, and iterate fast.
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-1 text-orange-300/80 text-xs">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                  <span>Quick & creative</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="text-orange-200/60 text-center text-xs text-balance">
        By signing in, you agree to our{" "}
        <a href="#" className="text-orange-300/80 hover:text-orange-200 underline underline-offset-4 transition-colors">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="text-orange-300/80 hover:text-orange-200 underline underline-offset-4 transition-colors">
          Privacy Policy
        </a>
        .
      </div>
    </div>
  )
}
