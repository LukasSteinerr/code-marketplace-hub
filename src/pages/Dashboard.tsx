import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Plus, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GameCard from "@/components/GameCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: gameCodes, isLoading } = useQuery({
    queryKey: ['game-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_codes')
        .select('*')
        .eq('status', 'available');
      
      if (error) throw error;
      return data;
    }
  });

  const filteredCodes = gameCodes?.filter(code => 
    code.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen p-6 animate-fadeIn">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold">Game Keys Marketplace</h1>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter size={18} />
              Filter
            </Button>
            <Button 
              onClick={() => navigate("/list-code")} 
              className="flex items-center gap-2"
            >
              <Plus size={18} />
              List Code
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2"
            >
              <User size={18} />
              Profile
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCodes?.map((game) => (
              <GameCard 
                key={game.id} 
                game={{
                  id: game.id,
                  title: game.title,
                  price: game.price,
                  seller: "Seller",
                  codesAvailable: 1,
                  image: "https://placehold.co/300x400",
                }} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;