import { toast } from "react-hot-toast";

export interface ToastProps {
  variant: "default" | "destructive";
  title: string;
  description: string;
}

export const customToast = ({ variant = "default", title, description }: ToastProps) => {
  const message = description ? `${title}: ${description}` : title;
  
  if (variant === "destructive") {
    toast.error(message);
  } else {
    toast.success(message);
  }
}; 