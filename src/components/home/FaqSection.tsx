import { FAQ_ITEMS } from "@/lib/copy/faq";
import { DisplayHeadline } from "@/components/system";

export function FaqSection() {
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <DisplayHeadline as="h2" align="center" size="md" accent="friends">
        Questions you'd ask if we were friends.
      </DisplayHeadline>
      <div className="space-y-3">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.q}
            className="rounded-2xl border-[3px] border-border bg-card text-foreground shadow-[4px_4px_0_#000] open:bg-card"
          >
            <summary className="cursor-pointer list-none px-5 py-4 text-left text-lg font-extrabold marker:content-none">
              {item.q}
            </summary>
            <p className="px-5 pb-5 text-sm leading-6 text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
