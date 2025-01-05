import { ShoppingCart, Globe2, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface GameCardProps {
  game: {
    id: string;
    title: string;
    price: number;
    seller: string;
    codesAvailable: number;
    image: string;
    platform: string;
    region?: string | null;
    originalValue?: number | null;
  };
}

const GameCard = ({ game }: GameCardProps) => {
  const navigate = useNavigate();
  const discount = game.originalValue 
    ? Math.round(((game.originalValue - game.price) / game.originalValue) * 100)
    : 0;

  // Format price in USD
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:translate-y-[-4px] hover:shadow-xl bg-white/5 backdrop-blur-sm border-white/10">
      <CardHeader className="p-0">
        <div className="relative overflow-hidden">
          <img
            src={game.image}
            alt={game.title}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {discount > 0 && (
            <div className="absolute top-4 right-4 bg-primary text-white px-2 py-1 rounded-full text-sm font-bold">
              -{discount}%
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 relative z-10">
        <CardTitle className="text-xl mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text">
          {game.title}
        </CardTitle>
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-primary">{formatPrice(game.price)}</span>
            {game.originalValue && (
              <span className="text-sm text-white/40 line-through">
                {formatPrice(game.originalValue)}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-white/70">
              <Monitor className="w-4 h-4" />
              <span className="text-sm">{game.platform}</span>
            </div>
            {game.region && (
              <div className="flex items-center gap-1 text-white/70">
                <Globe2 className="w-4 h-4" />
                <span className="text-sm">{game.region}</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-white/60">Seller: {game.seller}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all duration-300"
          onClick={() => navigate(`/game/${game.id}`)}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GameCard;