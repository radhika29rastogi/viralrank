"use client";

import { useState } from "react";
import { ColorBlock, DisplayHeadline } from "@/components/system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORM_NAME, SUPPORT_EMAIL } from "@/lib/copy/platform";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <DisplayHeadline size="md">Contact Us</DisplayHeadline>
      <ColorBlock color="cream" padding="lg" className="space-y-6">
        <div className="space-y-2 text-sm text-neutral-700">
          <p>
            <span className="font-bold text-black">Platform:</span> {PLATFORM_NAME}
          </p>
          <p>
            <span className="font-bold text-black">Support email:</span>{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p>
            <span className="font-bold text-black">Response time:</span> We aim to respond within 2–3
            business days.
          </p>
        </div>
        {sent ? (
          <p className="text-sm font-bold text-black">
            Thank you — your message has been noted. For urgent payment issues, email {SUPPORT_EMAIL}{" "}
            directly.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" required rows={5} />
            </div>
            <Button type="submit" size="lg">
              Send message
            </Button>
          </form>
        )}
      </ColorBlock>
    </div>
  );
}
