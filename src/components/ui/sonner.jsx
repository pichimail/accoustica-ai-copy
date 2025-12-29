"use client";
import { Toaster as Sonner } from "sonner"
import { useTheme } from "@/lib/theme-context";

const Toaster = ({
  ...props
}) => {
  const { theme } = useTheme()
  const sonnerTheme = theme === "pastel-neon" ? "light" : "dark";

  return (
    (<Sonner
      theme={sonnerTheme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props} />)
  );
}

export { Toaster }
