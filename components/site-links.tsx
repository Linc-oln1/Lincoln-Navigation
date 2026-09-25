import Link from "next/link"
import { cn } from "@/lib/utils"

/** "By continuing you agree to our Terms and Privacy Policy." */
export function AgreeLine({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] leading-snug text-muted-foreground", className)}>
      By continuing you agree to our{" "}
      <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
        Privacy Policy
      </Link>
      .
    </p>
  )
}
