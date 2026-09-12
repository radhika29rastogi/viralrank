import { Badge, ColorBlock } from "@/components/system";

const steps = [
  {
    color: "blue" as const,
    n: "01",
    icon: "➕",
    title: "Add a creator",
    body: "Paste an Instagram URL. We fetch the real name, photo, and followers. Anyone can submit — no account.",
    tag: "No login",
  },
  {
    color: "coral" as const,
    n: "02",
    icon: "💸",
    title: "Bid or hype",
    body: "Bid from ₹199, then current + ₹100. Hype from ₹49 without changing rank.",
    tag: "₹199+",
  },
  {
    color: "lime" as const,
    n: "03",
    icon: "🏆",
    title: "Climb the ranking",
    body: "Highest verified paid amount holds the rank until someone beats it.",
    tag: "Verified",
  },
];

export function HowItWorks() {
  return (
    <section>
      <h2 className="mb-8 text-center text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
        How it works
      </h2>
      <div className="grid gap-8 md:grid-cols-3">
        {steps.map((step, i) => (
          <ColorBlock
            key={step.n}
            color={step.color}
            rotate={i === 0 ? -1 : i === 2 ? 1 : 0}
            padding="lg"
          >
            <span className="absolute top-4 left-5 text-6xl font-extrabold text-on-accent/15">{step.n}</span>
            <span className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full border-[3px] border-border bg-card text-lg text-foreground shadow-[4px_4px_0_#000]">
              {step.icon}
            </span>
            <div className="relative mt-10">
              <h3 className="text-xl font-extrabold text-on-accent">{step.title}</h3>
              <p className="mt-2 text-sm text-on-accent/80">{step.body}</p>
            </div>
            <Badge color="cream" float="bl">
              {step.tag}
            </Badge>
          </ColorBlock>
        ))}
      </div>
    </section>
  );
}
