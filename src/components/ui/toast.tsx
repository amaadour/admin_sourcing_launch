import { toast } from "sonner";

// Re-export toast from sonner
export { toast };

interface ToastProps {
  variant: "default" | "destructive";
  title: string;
  description: string;
}

// Add showToast function
export const showToast = (message: string, type: 'success' | 'error' | 'loading' = 'success') => {
  switch (type) {
    case 'success':
      toast.success(message);
      break;
    case 'error':
      toast.error(message);
      break;
    case 'loading':
      toast.loading(message);
      break;
    default:
      toast(message);
  }
};

export const customToast = ({ variant, title, description }: ToastProps) => {
  if (variant === "destructive") {
    toast.error(title, {
      description: description,
      duration: 3000,
      position: "top-right",
    });
  } else {
    toast.success(title, {
      description: description,
      duration: 3000,
      position: "top-right",
    });
  }
}; 