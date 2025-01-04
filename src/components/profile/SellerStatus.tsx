import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface SellerStatusProps {
  status: string | null;
}

export const SellerStatus = ({ status: initialStatus }: SellerStatusProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState(initialStatus);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const checkSellerStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Get seller status
        const { data: sellerData, error: sellerError } = await supabase
          .from('sellers')
          .select('status, stripe_account_id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (sellerError) throw sellerError;

        if (sellerData?.stripe_account_id) {
          // If we have a stripe_account_id, check the account status
          const { data, error } = await supabase.functions.invoke('check-account-status', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (error) throw error;
          if (data?.status === 'active') {
            // Update seller status in database
            const { error: updateError } = await supabase
              .from('sellers')
              .update({ status: 'active' })
              .eq('id', session.user.id);

            if (updateError) throw updateError;
            setStatus('active');
          }
        }

        // Handle redirect from Stripe onboarding
        const redirectStatus = searchParams.get('status');
        if (redirectStatus) {
          if (redirectStatus === 'success') {
            toast({
              title: "Onboarding in progress",
              description: "Your seller account is being reviewed. This may take a few minutes.",
            });
          } else {
            toast({
              title: "Onboarding incomplete",
              description: "Please complete the onboarding process to start selling.",
              variant: "destructive",
            });
          }
          // Clear the URL parameters
          navigate('/profile', { replace: true });
        }
      } catch (error: any) {
        console.error('Status check error:', error);
        toast({
          variant: "destructive",
          title: "Error checking seller status",
          description: error.message
        });
      }
    };

    checkSellerStatus();
  }, [toast, navigate, searchParams]);

  const handleStripeOnboarding = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({
        variant: "destructive",
        title: "Error starting onboarding",
        description: error.message
      });
    }
  };

  const handleRestartOnboarding = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Delete existing seller record
      const { error: deleteError } = await supabase
        .from('sellers')
        .delete()
        .eq('id', session.user.id);

      if (deleteError) throw deleteError;

      // Start new onboarding process
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      if (data?.url) window.location.href = data.url;

    } catch (error: any) {
      console.error('Restart onboarding error:', error);
      toast({
        variant: "destructive",
        title: "Error restarting onboarding",
        description: error.message
      });
    }
  };

  const getStatusDisplay = () => {
    if (!status) return {
      icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
      text: "Not registered as a seller",
      description: "Register as a seller to start listing game codes",
      showStartButton: true,
      showRestartButton: true
    };

    switch (status) {
      case 'active':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: "Active Seller",
          description: "You can list and sell game codes",
          showStartButton: false,
          showRestartButton: false
        };
      case 'pending':
        return {
          icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
          text: "Pending Seller",
          description: "Your seller application is being processed",
          showStartButton: false,
          showRestartButton: true
        };
      case 'onboarding':
        return {
          icon: <AlertCircle className="h-5 w-5 text-blue-500" />,
          text: "Complete Onboarding",
          description: "Please complete your seller onboarding",
          showStartButton: true,
          showRestartButton: true
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          text: "Unknown Status",
          description: "Please contact support",
          showStartButton: false,
          showRestartButton: true
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
        <div className="flex gap-2">
          {statusDisplay.showRestartButton && (
            <Button 
              onClick={handleRestartOnboarding}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Restart Onboarding
            </Button>
          )}
          {statusDisplay.showStartButton && (
            <Button onClick={handleStripeOnboarding}>
              Start Selling
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};