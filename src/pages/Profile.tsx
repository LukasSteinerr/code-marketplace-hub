import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ProfileNav } from "@/components/profile/ProfileNav";
import { DeleteAccount } from "@/components/profile/DeleteAccount";
import { SellerStatus } from "@/components/profile/seller/SellerStatus";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        if (!session) {
          navigate("/login");
          return;
        }

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!session) {
            navigate("/login");
          }
        });

        // Fetch seller status
        const { data: sellerData, error: sellerError } = await supabase
          .from('sellers')
          .select('status')
          .eq('id', session.user.id)
          .maybeSingle();

        if (sellerError) {
          console.error('Seller status error:', sellerError);
          throw sellerError;
        }

        setSellerStatus(sellerData?.status || null);

        // Cleanup subscription on unmount
        return () => {
          subscription.unsubscribe();
        };
      } catch (error: any) {
        console.error('Profile auth error:', error);
        await supabase.auth.signOut();
        toast({
          title: "Session expired",
          description: "Please sign in again.",
          variant: "destructive",
        });
        navigate("/login");
      }
    };
    
    checkAuth();
  }, [navigate, toast]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        if (error.status === 403) {
          toast({
            title: "Already logged out",
            description: "Your session has expired. Redirecting to login...",
          });
          await supabase.auth.signOut({ scope: 'local' });
          navigate("/login");
          return;
        }
        throw error;
      }
      
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
      navigate("/login");
    } catch (error: any) {
      console.error("Logout error:", error);
      await supabase.auth.signOut({ scope: 'local' });
      toast({
        title: "Error during logout",
        description: "Please try again or refresh the page.",
        variant: "destructive",
      });
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto p-6 max-w-4xl">
        <ProfileNav />
        
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Profile Settings
            </h1>
            <Button 
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2 hover:bg-muted/50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>

          <div className="grid gap-6 bg-card/30 backdrop-blur-sm rounded-xl p-6 border border-border/50 shadow-xl">
            <SellerStatus status={sellerStatus} />
            <DeleteAccount />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;