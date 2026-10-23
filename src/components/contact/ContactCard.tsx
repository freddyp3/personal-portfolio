"use client";

import { sendEmail } from "@/lib/actions";
import { ContactFormSchema } from "@/lib/schemas";
import socials from "@/data/socials.json";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import SiteNav from "../SiteNav";
import { TabIcon } from "../nodes/shapes";
import styles from "./contact.module.css";

type Inputs = z.infer<typeof ContactFormSchema>;

const LINK_ROWS = [
  ...socials.socials.map((s) => ({
    name: s.name,
    href: s.href,
    display:
      s.name === "Email"
        ? "fredrikpettit@gmail.com"
        : s.href.replace(/^https?:\/\/(www\.)?/, ""),
    external: s.href.startsWith("http"),
  })),
  {
    name: "Resume",
    href: "/resume.pdf",
    display: "resume.pdf",
    external: true,
  },
];

export default function ContactCard() {
  const [review, setReview] = useState<Inputs | null>(null);
  const [sending, setSending] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Inputs>({
    resolver: zodResolver(ContactFormSchema),
    defaultValues: { name: "", email: "", message: "" },
  });

  const handleFormSubmit: SubmitHandler<Inputs> = (data) => {
    const honeypot = document.querySelector(
      'input[name="website"]',
    ) as HTMLInputElement;
    if (honeypot?.value) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    setReview(data);
  };

  const processForm = async () => {
    if (!review) return;
    setSending(true);
    const result = await sendEmail(review);
    setSending(false);

    if (result.error) {
      toast.error("Couldn't send. Email me at fredrikpettit@gmail.com instead.");
      return;
    }

    toast.success("Message sent.");
    reset();
    setReview(null);
  };

  return (
    <div className={styles.root}>
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.headerRow}>
            <span className={styles.tabIcon}>
              <TabIcon kind="info" />
            </span>
            <span className={styles.tabTitle}>Contact</span>
          </div>

          <p className={styles.intro}>
            Reach out about internships, projects, or anything on this site.
          </p>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Links</span>
            <ul className={styles.list}>
              {LINK_ROWS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className={styles.indexLink}
                    {...(l.external
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                  >
                    <span className={styles.itemId} />
                    <span className={styles.itemTitle}>
                      <h3>{l.display}</h3>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Send a message</span>
            <form onSubmit={handleSubmit(handleFormSubmit)}>
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className={styles.honeypot}
              />

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="given-name"
                  {...register("name")}
                />
                {errors.name?.message && (
                  <p className={styles.fieldError}>{errors.name.message}</p>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email?.message && (
                  <p className={styles.fieldError}>{errors.email.message}</p>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  {...register("message")}
                />
                {errors.message?.message && (
                  <p className={styles.fieldError}>{errors.message.message}</p>
                )}
              </div>

              {review ? (
                <div className={styles.review}>
                  <p>I&apos;ll reply to {review.email}.</p>
                  <div className={styles.reviewActions}>
                    <button
                      type="button"
                      className={styles.textButton}
                      onClick={processForm}
                      disabled={sending}
                    >
                      {sending ? "Sending…" : "Send"}
                    </button>
                    <button
                      type="button"
                      className={styles.textButton}
                      onClick={() => setReview(null)}
                      disabled={sending}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting}
                  >
                    Review message
                  </button>
                  <p className={styles.privacy}>
                    By sending, you agree to the{" "}
                    <Link href="/privacy">privacy policy</Link>.
                  </p>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
      <SiteNav active="contact" variant="nodes" />
    </div>
  );
}
