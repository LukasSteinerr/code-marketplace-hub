import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Monitor, Globe2, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Database } from "@/integrations/supabase/types";

type GameCode = Database['public']['Tables']['game_codes']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface GameWithProfile extends GameCode {
  seller_profile: Profile | null;
}

const GameDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: game, isLoading } = useQuery<GameWithProfile>({
    queryKey: ['game', id],
    queryFn: async () => {
      const { data: gameData, error } = await supabase
        .from('game_codes')
        .select(`
          *,
          seller_profile:profiles(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Ensure the response matches our expected type
      if (!gameData) throw new Error('Game not found');
      
      // Transform the data to ensure it matches our type
      const transformedData: GameWithProfile = {
        ...gameData,
        seller_profile: gameData.seller_profile as Profile
      };

      return transformedData;
    }
  });

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
        body: { gameId: id }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-8 w-64 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Game not found</h1>
          <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const discount = game.original_value 
    ? Math.round(((game.original_value - game.price) / game.original_value) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-lg">
              <img
                src={getGameImage(game.title)}
                alt={game.title}
                className="w-full aspect-video object-cover"
              />
              {discount > 0 && (
                <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-sm font-bold">
                  -{discount}% OFF
                </div>
              )}
            </div>

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
                  onClick={handleBuyNow}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Buy Now
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card/10 backdrop-blur-sm rounded-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold">Game Details</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Monitor className="w-4 h-4" />
                  <span>Platform: {game.platform}</span>
                </div>
                
                {game.region && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe2 className="w-4 h-4" />
                    <span>Region: {game.region}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>Seller: {game.seller_profile?.username || 'Anonymous'}</span>
                </div>

                {game.expiration_date && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Expires: {format(new Date(game.expiration_date), 'PP')}</span>
                  </div>
                )}
              </div>
            </div>

            {game.description && (
              <div className="bg-card/10 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold">Description</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">{game.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const getGameImage = (title: string) => {
  const gameImages: Record<string, string> = {
    "Red Dead Redemption 2": "https://upload.wikimedia.org/wikipedia/en/4/44/Red_Dead_Redemption_II.jpg",
    "The Legend of Zelda: Breath of the Wild": "https://upload.wikimedia.org/wikipedia/en/c/c6/The_Legend_of_Zelda_Breath_of_the_Wild.jpg",
    "FIFA 24": "https://upload.wikimedia.org/wikipedia/en/a/a6/FIFA_24_Cover.jpg",
  };
  return gameImages[title] || "https://placehold.co/600x400/171717/6366f1/png?text=Game+Image";
};

export default GameDetails;