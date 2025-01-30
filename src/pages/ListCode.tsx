import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ListingForm } from "@/components/listing/ListingForm";

const ListCode = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const { data: seller } = useQuery({
    queryKey: ["seller-status"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: seller } = await supabase
        .from("sellers")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      return seller;
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate]);

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
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!seller || seller.status !== "active") {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-6">Complete Your Seller Profile</h1>
          <p className="mb-6">Please complete your seller onboarding to start listing game codes.</p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => navigate("/dashboard")}>
              Return to Dashboard
            </Button>
            <Button 
              onClick={handleStripeOnboarding}
              variant="default"
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              Complete Seller Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">List a Game Code</h1>
        <ListingForm />
      </div>
    </div>
  );
};

export default ListCode;