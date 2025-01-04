import { supabase } from "@/integrations/supabase/client";

interface GameImageProps {
  title: string;
  discount?: number;
}

export const GameImage = ({ title, discount }: GameImageProps) => {
  const getGameImage = async (title: string) => {
    const { data } = await supabase
      .storage
      .from('game-images')
      .list(`games/${title}`);

    if (data && data.length > 0) {
      const { data: imageUrl } = supabase
        .storage
        .from('game-images')
        .getPublicUrl(`games/${title}/${data[0].name}`);
      return imageUrl.publicUrl;
    }

    // Fallback images
    const gameImages: Record<string, string> = {
      "Red Dead Redemption 2": "https://upload.wikimedia.org/wikipedia/en/4/44/Red_Dead_Redemption_II.jpg",
      "The Legend of Zelda: Breath of the Wild": "https://upload.wikimedia.org/wikipedia/en/c/c6/The_Legend_of_Zelda_Breath_of_the_Wild.jpg",
      "FIFA 24": "https://upload.wikimedia.org/wikipedia/en/a/a6/FIFA_24_Cover.jpg",
    };
    return gameImages[title] || "https://placehold.co/600x400/171717/6366f1/png?text=Game+Image";
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      <img
        src={getGameImage(title)}
        alt={title}
        className="w-full aspect-video object-cover"
      />
      {discount && discount > 0 && (
        <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-sm font-bold">
          -{discount}% OFF
        </div>
      )}
    </div>
  );
};