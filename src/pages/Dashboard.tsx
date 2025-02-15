import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Plus, User, Package, Loader2, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GameCard from "@/components/GameCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type GameCode = Database['public']['Tables']['game_codes']['Row'];

const CATEGORIES = [
  'All',
  'Action',
  'Adventure',
  'RPG',
  'Sports',
  'Strategy',
  'Racing',
  'Simulation',
  'Fighting',
  'Horror',
  'Platformer',
  'Shooter',
  'Puzzle',
  'Family'
] as const;

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const { toast } = useToast();

  const { data: gameCodes, isLoading, error } = useQuery({
    queryKey: ['game-codes'],
    queryFn: async () => {
      console.log('Fetching available game codes...');
      
      const { data, error } = await supabase
        .from('game_codes')
        .select('*')
        .eq('status', 'available')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching game codes:', error);
        throw error;
      }

      console.log('Available game codes fetched:', data);
      return data as GameCode[];
    },
    refetchInterval: 10000,
  });

  const filteredCodes = gameCodes?.filter(code => {
    const matchesSearch = code.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || code.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  console.log('Filtered codes:', filteredCodes);

  const getGameImage = (title: string) => {
    const gameImages: Record<string, string> = {
      "Red Dead Redemption 2": "https://upload.wikimedia.org/wikipedia/en/4/44/Red_Dead_Redemption_II.jpg",
      "The Legend of Zelda: Breath of the Wild": "https://upload.wikimedia.org/wikipedia/en/c/c6/The_Legend_of_Zelda_Breath_of_the_Wild.jpg",
      "FIFA 24": "https://upload.wikimedia.org/wikipedia/en/a/a6/FIFA_24_Cover.jpg",
    };
    return gameImages[title] || "https://placehold.co/600x400/171717/6366f1/png?text=Game+Image";
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-card/10 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-border/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
            <div 
              onClick={() => navigate('/dashboard')} 
              className="flex items-center gap-3 w-full md:w-auto cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-primary">
                Game Marketplace
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card/10 border-border/10"
                />
              </div>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[180px] bg-card/10 border-border/10">
                  <Tag className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={() => navigate("/list-code")} 
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                List Game
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/profile")}
                className="bg-card/10"
              >
                <User className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Game Cards Grid */}
        <div className="relative min-h-[300px]">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading available games...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-card/10 backdrop-blur-sm rounded-xl border border-border/10">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold text-foreground">Error loading game codes</h2>
              <p className="text-muted-foreground mt-2">Please try again later</p>
            </div>
          ) : filteredCodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCodes.map((game) => (
                <GameCard
                  key={game.id}
                  game={{
                    id: game.id,
                    title: game.title,
                    price: Number(game.price),
                    seller: "Anonymous",
                    codesAvailable: 1,
                    image: getGameImage(game.title),
                    platform: game.platform,
                    region: game.region || "Global",
                    originalValue: game.original_value ? Number(game.original_value) : undefined,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-card/10 backdrop-blur-sm rounded-xl border border-border/10">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold text-foreground">No game codes found</h2>
              <p className="text-muted-foreground mt-2">Try adjusting your search criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;