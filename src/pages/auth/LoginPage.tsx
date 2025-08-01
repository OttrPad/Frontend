import { LoginForm } from "@/components/login-form";
import Background from "@/assets/1234.jpeg";

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
    </div>
  );
}
