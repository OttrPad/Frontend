import { LoginForm } from "@/components/login-form";
import Background from "@/assets/background.jpeg";

export default function LoginPage() {
  return (
    <div className="relative bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10 w-full bg-cover bg-center bg-no-repeat"
    style={{
        backgroundImage: `url(${Background})`,
      }}>
      <div className="absolute inset-0 bg-black/40 z-0"></div>
      <div className="w-full max-w-sm md:max-w-md">
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
