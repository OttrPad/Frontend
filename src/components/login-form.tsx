import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import supabase from '../lib/supabaseClient.tsx' 
import { toast } from 'react-toastify'


export function LoginForm({
  
  className,
  ...props
}: React.ComponentProps<"div">) {


 




const handleGoogleLogin = async () => {
  try {
    const {error} = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/Home` // Optional: specify redirect URL
      }
      
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
      <Card className="overflow-hidden p-0 backdrop-blur-lg bg-black/10 border border-white/30">
        <CardContent className="p-0">
          <form  className="p-6 md:p-8 ">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold text-white">Welcome back</h1>
                <p className="text-muted-foreground text-balance">
                   {currentState === 'SignIn' ? 'Sign in to your account' : 'Create an account'}
                </p>
              </div>
             

 
              <Button  type="submit" disabled={loading} className="w-full">
                Continue with
              </Button>
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                
              </div>
              <div className="grid grid-row-3 gap-3">
                <Button variant="outline" type="button" className="w-full flex hover:bg-gray-200 hover:text-black focus:outline-none transition duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                      fill="currentColor"
                    />
                  </svg>        
                  <span >Continue with Apple</span>
                </Button>
                <Button onClick={handleGoogleLogin} variant="outline" type="button" className="w-full hover:bg-gray-200 hover:text-black focus:outline-none transition duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </Button>
                <Button variant="outline" type="button" className="w-full hover:bg-gray-200 hover:text-black focus:outline-none transition duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 2.17-.38 3.93-.85 3.93-.47 0-.85-1.76-.85-3.93s.38-3.93.85-3.93.85 1.76.85 3.93z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>Continue with Meta</span>
                </Button>
              </div>
              { currentState === 'SignIn' ? <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <a onClick={()=>setCurrentState('SignUp')} href="#" className="underline underline-offset-4">
                  Sign up
                </a>
              </div> : 
              <div className="text-center text-sm">
                Login here{" "}
                <a onClick={()=>setCurrentState('SignIn')} href="#" className="underline underline-offset-4">
                  Sign In
                </a>
              </div>}
              
            </div>
          </form>
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


