import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GameCard from "@/components/GameCard";

// Mock data for initial display
const MOCK_GAMES = [
  {
    id: 1,
    title: "Cyberpunk 2077",
    price: 39.99,
    seller: "GameStore",
    codesAvailable: 5,
    image: "https://placehold.co/300x400",
  },
  {
    id: 2,
    title: "Red Dead Redemption 2",
    price: 44.99,
    seller: "KeyShop",
    codesAvailable: 3,
    image: "https://placehold.co/300x400",
  },
  {
    id: 3,
    title: "Elden Ring",
    price: 49.99,
    seller: "DigitalKeys",
    codesAvailable: 8,
    image: "https://placehold.co/300x400",
  },
];

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");

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
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_GAMES.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;