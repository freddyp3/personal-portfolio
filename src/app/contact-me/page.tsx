import type { Metadata } from "next";
import ContactCard from "@/components/contact/ContactCard";

export const metadata: Metadata = {
  title: "Contact",
  description: "Email, LinkedIn, GitHub and a contact form for Fredrik Pettit.",
};

export default function ContactPage() {
  return <ContactCard />;
}
