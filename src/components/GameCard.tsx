import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GameCardProps {
  game: {
    id: number;
    title: string;
    price: number;
    seller: string;
    codesAvailable: number;
    image: string;
  };
}

const GameCard = ({ game }: GameCardProps) => {
  return (
    <div className="game-card">
      <img
        src={game.image}
        alt={game.title}
        className="w-full h-48 object-cover rounded-md mb-4"
      />
      <h3 className="text-xl font-semibold mb-2">{game.title}</h3>
      <div className="flex justify-between items-center mb-4">
        <span className="text-2xl font-bold text-accent">${game.price}</span>
        <span className="text-sm text-muted-foreground">{game.codesAvailable} codes available</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Seller: {game.seller}</span>
        <Button className="bg-primary hover:bg-primary/90">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Buy Now
        </Button>
      </div>
    </div>
  );
};

export default GameCard;