import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface GameCardProps {
  game: {
    id: string;
    title: string;
    price: number;
    seller: string;
    codesAvailable: number;
    image: string;
  };
}

const GameCard = ({ game }: GameCardProps) => {
  const { toast } = useToast();

  const handleBuyNow = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to purchase game codes",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { gameId: game.id }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate checkout. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-0">
        <img
          src={game.image}
          alt={game.title}
          className="w-full h-48 object-cover"
        />
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-xl mb-2">{game.title}</CardTitle>
        <div className="flex justify-between items-center mb-2">
          <span className="text-2xl font-bold text-primary">${game.price}</span>
          <span className="text-sm text-muted-foreground">
            {game.codesAvailable} available
          </span>
        </div>
        <p className="text-sm text-muted-foreground">Seller: {game.seller}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full" onClick={handleBuyNow}>
          <ShoppingCart className="w-4 h-4 mr-2" />
          Buy Now
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GameCard;