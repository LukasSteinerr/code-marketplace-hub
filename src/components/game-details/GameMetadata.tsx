import { Monitor, Globe2, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { GameWithProfile } from "@/pages/GameDetails";

interface GameMetadataProps {
  game: GameWithProfile;
}

export const GameMetadata = ({ game }: GameMetadataProps) => {
  return (
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
  );
};