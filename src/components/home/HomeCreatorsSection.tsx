import { Badge, BoldButton, ColorBlock, DisplayHeadline } from "@/components/system";
import { CreatorDirectoryCard } from "@/components/creator/CreatorDirectoryCard";
import { CreatorsCarousel } from "@/components/home/CreatorsCarousel";
import type { Creator } from "@/types/database";

export function HomeCreatorsSection({ creators }: { creators: Creator[] }) {
  return (
    <section className="space-y-10 py-4" data-analytics="home_trending_creators">
      <div className="text-center">
        <Badge color="pink" icon="🔥">
          Trending Creators
        </Badge>
        <DisplayHeadline as="h2" align="center" size="md" className="mt-4" accent="Creators">
          Trending Creators
        </DisplayHeadline>
        <p className="mt-3 text-muted-foreground">
          Paid, active listings with avatar, category, hype, and rank.
        </p>
      </div>
      {creators.length ? (
        <>
          {creators.length <= 4 ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {creators.map((creator, index) => (
                <CreatorDirectoryCard key={creator.id} creator={creator} index={index} />
              ))}
            </div>
          ) : (
            <CreatorsCarousel creators={creators} />
          )}
          <div className="flex justify-center">
            <BoldButton href="/explore" color="yellow">
              See all creators
            </BoldButton>
          </div>
        </>
      ) : (
        <ColorBlock color="cream" className="py-12 text-center">
          <p className="font-extrabold text-foreground">No listed creators yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Unpaid submissions stay private. Complete the listing payment to appear here.
          </p>
          <div className="mt-6 flex justify-center">
            <BoldButton href="/submit" color="pink">
              Rank a Creator
            </BoldButton>
          </div>
        </ColorBlock>
      )}
    </section>
  );
}
