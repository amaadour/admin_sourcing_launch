import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard for Managing Client Orders Efficiently",
  description: "Admin Dashboard for Managing Client Orders Efficiently",
};

export default function SignIn() {
  return <SignInForm />;
}
