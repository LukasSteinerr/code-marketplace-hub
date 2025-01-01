import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SellerStatusProps {
  status: string | null;
}

export const SellerStatus = ({ status }: SellerStatusProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleStripeOnboarding = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('sb-token')}`,
        },
      });
      
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error starting onboarding",
        description: error.message
      });
    }
  };

  const getStatusDisplay = () => {
    if (!status) return {
      icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
      text: "Not registered as a seller",
      description: "Register as a seller to start listing game codes",
      showButton: true
    };

    switch (status) {
      case 'active':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: "Active Seller",
          description: "You can list and sell game codes",
          showButton: false
        };
      case 'pending':
        return {
          icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
          text: "Pending Seller",
          description: "Your seller application is being processed",
          showButton: false
        };
      case 'onboarding':
        return {
          icon: <AlertCircle className="h-5 w-5 text-blue-500" />,
          text: "Complete Onboarding",
          description: "Please complete your seller onboarding",
          showButton: true
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          text: "Unknown Status",
          description: "Please contact support",
          showButton: false
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="border-t pt-4">
      <label className="text-sm font-medium text-muted-foreground">Seller Status</label>
      <div className="flex items-center gap-2 mt-2">
        {statusDisplay.icon}
        <div className="flex-1">
          <p className="font-medium">{statusDisplay.text}</p>
          <p className="text-sm text-muted-foreground">{statusDisplay.description}</p>
        </div>
        {statusDisplay.showButton && (
          <Button onClick={handleStripeOnboarding}>
            Start Selling
          </Button>
        )}
      </div>
    </div>
  );
};