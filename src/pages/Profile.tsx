import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ProfileNav } from "@/components/profile/ProfileNav";
import { DeleteAccount } from "@/components/profile/DeleteAccount";
import { SellerStatus } from "@/components/profile/SellerStatus";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
    };
    
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        // If we get a 403/user not found error, we can consider the user already logged out
        if (error.status === 403) {
          toast({
            title: "Already logged out",
            description: "Your session has expired. Redirecting to login...",
          });
          // Clear any remaining session data and redirect
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
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error during logout",
        description: "Please try again or refresh the page.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <ProfileNav />
      
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="grid gap-6">
          <SellerStatus />
          <DeleteAccount />
        </div>
      </div>
    </div>
  );
};

export default Profile;