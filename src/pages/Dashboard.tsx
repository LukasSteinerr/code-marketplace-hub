import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Plus, User, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GameCard from "@/components/GameCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type GameCode = Database['public']['Tables']['game_codes']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

type GameCodeWithProfile = GameCode & {
  profiles: Profile;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: gameCodes, isLoading, error } = useQuery({
    queryKey: ['game-codes'],
    queryFn: async () => {
      console.log('Fetching game codes...');
      const { data, error } = await supabase
        .from('game_codes')
        .select(`
          *,
          profiles(*)
        `)
        .eq('status', 'available');
      
      if (error) {
        console.error('Error fetching game codes:', error);
        throw error;
      }
      
      console.log('Fetched game codes:', data);
      return data as GameCodeWithProfile[];
    },
    meta: {
      errorMessage: "Failed to load game codes. Please try again.",
      onError: (error: Error) => {
        console.error('Query error:', error);
        toast({
          title: "Error",
          description: "Failed to load game codes. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const filteredCodes = gameCodes?.filter(code => 
    code.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen gradient-bg p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section with Glass Effect */}
        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Available Game Keys
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-80 group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground group-hover:text-primary transition-colors" />
                <Input
                  type="text"
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/80 border-border/20 transition-all duration-300 focus:bg-white focus:ring-2 focus:ring-primary"
                />
              </div>
              <Button 
                variant="outline" 
                className="flex items-center gap-2 bg-white/80 border-border/20 hover:bg-white/90 transition-all duration-300"
              >
                <Filter size={18} />
                Filter
              </Button>
              <Button 
                onClick={() => navigate("/list-code")} 
                className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all duration-300"
              >
                <Plus size={18} />
                List Code
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 hover:bg-white/50 transition-all duration-300"
              >
                <User size={18} />
                Profile
              </Button>
            </div>
          </div>
        </div>

        {/* Game Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className="h-[400px] glass-card animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 glass-card animate-fade-in">
            <h2 className="text-2xl font-semibold text-foreground">Error loading game codes</h2>
            <p className="text-muted-foreground mt-2">Please try again later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCodes?.map((game, index) => (
              <div 
                key={game.id}
                className="opacity-0 animate-[fade-in_0.5s_ease-out_forwards]"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <GameCard
                  game={{
                    id: game.id,
                    title: game.title,
                    price: game.price,
                    seller: game.profiles?.username || "Anonymous",
                    codesAvailable: 1,
                    image: "https://placehold.co/600x400",
                    platform: game.platform,
                    region: game.region,
                    originalValue: game.original_value,
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredCodes?.length === 0 && !isLoading && !error && (
          <div className="text-center py-20 glass-card animate-fade-in">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-2xl font-semibold text-foreground">No game codes found</h2>
            <p className="text-muted-foreground mt-2">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;