"use client"

import { useState } from "react"
import { Download, Share, X } from "lucide-react"
import { useInstallPrompt } from "@/hooks/use-install-prompt"
import { cn } from "@/lib/utils"

interface InstallAppButtonProps {
  className?: string
}

/* Surfaces "switch from website to app" directly in the nav, rather
   than leaving it undiscoverable. Renders nothing once the app is
   already installed, and nothing on browsers that neither support
   `beforeinstallprompt` nor are iOS Safari (nothing useful to do
   there — desktop Firefox, for instance). */
export function InstallAppButton({ className }: InstallAppButtonProps) {
  const { canPromptInstall, showIOSInstructions, installed, promptInstall } =
    useInstallPrompt()
  const [showIOSTip, setShowIOSTip] = useState(false)

  if (installed || (!canPromptInstall && !showIOSInstructions)) {
    return null
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() =>
          canPromptInstall ? promptInstall() : setShowIOSTip((open) => !open)
        }
        className={cn(
          "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
          className
        )}
      >
        <Download className="w-4 h-4" />
        Install App
      </button>

      {showIOSTip && (
        <div className="absolute top-full right-0 mt-2 w-64 p-4 rounded-2xl bg-[#14181f] border border-white/10 shadow-2xl text-sm text-white/90 z-50">
          <button
            type="button"
            onClick={() => setShowIOSTip(false)}
            aria-label="Close"
            className="absolute top-2 right-2 p-1 text-white/50 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <p className="pr-4">
            Tap <Share className="w-3.5 h-3.5 inline -mt-0.5 mx-0.5" /> in Safari's
            toolbar, then choose <strong>Add to Home Screen</strong>.
          </p>
        </div>
      )}
    </div>
  )
}
