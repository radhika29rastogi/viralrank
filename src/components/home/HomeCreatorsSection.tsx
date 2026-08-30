import { Badge, DisplayHeadline } from "@/components/system";
import { CreatorsCarousel } from "@/components/home/CreatorsCarousel";
import type { Creator } from "@/types/database";

export function HomeCreatorsSection({ creators }: { creators: Creator[] }) {
  return (
    <section className="space-y-10 py-16">
      <div className="text-center">
        <Badge color="purple" icon="👀">
          Creators
        </Badge>
        <DisplayHeadline as="h2" align="center" size="md" className="mt-4">
          Creators are cooking. 👀
        </DisplayHeadline>
        <p className="mt-3 text-neutral-500">
          Discover the people behind the internet&apos;s next viral moment.
        </p>
      </div>
      <CreatorsCarousel creators={creators} />
    </section>
  );
}
