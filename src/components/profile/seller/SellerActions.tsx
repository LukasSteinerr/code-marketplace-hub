import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SellerActionsProps {
  showStartButton: boolean;
  showRestartButton: boolean;
  onStart: () => void;
  onRestart: () => void;
}

export const SellerActions = ({
  showStartButton,
  showRestartButton,
  onStart,
  onRestart
}: SellerActionsProps) => {
  return (
    <div className="flex gap-2">
      {showRestartButton && (
        <Button 
          onClick={onRestart}
          variant="outline"
          className="flex items-center gap-2 hover:bg-muted/50"
        >
          <RefreshCw className="h-4 w-4" />
          Restart Onboarding
        </Button>
      )}
      {showStartButton && (
        <Button 
          onClick={onStart}
          className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
        >
          Start Selling
        </Button>
      )}
    </div>
  );
};