import type { Metadata } from "next";
import ContactCard from "@/components/contact/ContactCard";

export const metadata: Metadata = {
  title: "contact",
};

export default function ContactPage() {
  return <ContactCard />;
}
