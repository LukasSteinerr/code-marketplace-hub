import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { GameHeader } from "@/components/game-details/GameHeader";
import { GameImage } from "@/components/game-details/GameImage";
import { GameInfo } from "@/components/game-details/GameInfo";
import { GameMetadata } from "@/components/game-details/GameMetadata";
import { GameDescription } from "@/components/game-details/GameDescription";

type GameCode = Database['public']['Tables']['game_codes']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export interface GameWithProfile extends GameCode {
  seller_profile: Profile | null;
}

const GameDetails = () => {
  const { id } = useParams();
  const { toast } = useToast();

  const { data: game, isLoading } = useQuery<GameWithProfile>({
    queryKey: ['game', id],
    queryFn: async () => {
      const { data: gameData, error } = await supabase
        .from('game_codes')
        .select(`
          *,
          seller_profile:profiles!game_codes_seller_profile_fkey(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!gameData) throw new Error('Game not found');
      
      return gameData as GameWithProfile;
    }
  });

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
          <GameHeader />
        </div>
      </div>
    );
  }

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

  const discount = game.original_value 
    ? Math.round(((game.original_value - game.price) / game.original_value) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <GameHeader />

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <GameImage title={game.title} discount={discount} />
            <GameInfo game={game} onBuyNow={handleBuyNow} />
          </div>

          <div className="space-y-6">
            <GameMetadata game={game} />
            <GameDescription description={game.description} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameDetails;
