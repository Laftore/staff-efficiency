"use client";

import { Toaster } from "sonner";

export function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      theme="dark"
      toastOptions={{
        style: {
          background: "#07070d",
          border: "1px solid #a855f7",
          color: "#ffffff",
        },
        classNames: {
          toast: "toast-dark",
          title: "text-sm font-semibold",
          description: "text-xs",
          actionButton: "bg-purple-600 hover:bg-purple-700",
          cancelButton: "bg-gray-700 hover:bg-gray-600",
          closeButton: "text-purple-500 hover:text-purple-400",
        },
      }}
    />
  );
}
