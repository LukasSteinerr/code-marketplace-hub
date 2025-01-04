import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { SellerStatusDisplay, getStatusDisplay } from "./SellerStatusDisplay";
import { SellerActions } from "./SellerActions";

interface SellerStatusProps {
  status: string | null;
}

export const SellerStatus = ({ status: initialStatus }: SellerStatusProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState(initialStatus);
  const [searchParams] = useSearchParams();
  const statusDisplay = getStatusDisplay(status);

  useEffect(() => {
    const checkSellerStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: sellerData, error: sellerError } = await supabase
          .from('sellers')
          .select('status, stripe_account_id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (sellerError) throw sellerError;

        if (sellerData?.stripe_account_id) {
          const { data, error } = await supabase.functions.invoke('check-account-status', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (error) throw error;
          if (data?.status === 'active') {
            const { error: updateError } = await supabase
              .from('sellers')
              .update({ status: 'active' })
              .eq('id', session.user.id);

            if (updateError) throw updateError;
            setStatus('active');
          }
        }

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

      const { error } = await supabase.functions.invoke('restart-connect-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      const { data: newAccountData, error: createError } = await supabase.functions.invoke('create-connect-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (createError) throw createError;
      if (newAccountData?.url) window.location.href = newAccountData.url;

    } catch (error: any) {
      console.error('Restart onboarding error:', error);
      toast({
        variant: "destructive",
        title: "Error restarting onboarding",
        description: error.message
      });
    }
  };

  return (
    <div className="border-t pt-4 animate-fade-in">
      <label className="text-sm font-medium text-muted-foreground">Seller Status</label>
      <div className="flex items-center gap-2 mt-2 p-4 bg-card/50 backdrop-blur-sm rounded-lg border border-border/50">
        <div className="flex-1">
          <SellerStatusDisplay status={status} />
        </div>
        <SellerActions
          showStartButton={statusDisplay.showStartButton}
          showRestartButton={statusDisplay.showRestartButton}
          onStart={handleStripeOnboarding}
          onRestart={handleRestartOnboarding}
        />
      </div>
    </div>
  );
};