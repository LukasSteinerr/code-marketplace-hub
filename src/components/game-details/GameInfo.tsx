import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameWithProfile } from "@/pages/GameDetails";

interface GameInfoProps {
  game: GameWithProfile;
  onBuyNow: () => void;
}

export const GameInfo = ({ game, onBuyNow }: GameInfoProps) => {
  const discount = game.original_value 
    ? Math.round(((game.original_value - game.price) / game.original_value) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">{game.title}</h1>
      
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-3xl font-bold text-primary">${game.price}</span>
          {game.original_value && (
            <span className="text-sm text-muted-foreground line-through">
              ${game.original_value}
            </span>
          )}
        </div>

        <Button 
          size="lg"
          className="ml-auto bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
          onClick={onBuyNow}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Buy Now
        </Button>
      </div>
    </div>
  );
};