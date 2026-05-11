import { LogIn } from "lucide-react";
import { Button } from "@/components/atoms/Button";

export function GoogleSignInButton({ children = "Google로 계속하기" }: { children?: React.ReactNode }) {
  return (
    <Button type="submit">
      <LogIn aria-hidden="true" className="h-5 w-5" />
      {children}
    </Button>
  );
}
