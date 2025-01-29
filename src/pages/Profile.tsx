import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ProfileNav } from "@/components/profile/ProfileNav";
import { DeleteAccount } from "@/components/profile/DeleteAccount";
import { SellerStatus } from "@/components/profile/SellerStatus";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { LogOut, User, Mail, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Profile {
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");

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

        setEmail(session.user.email);

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

        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          throw profileError;
        }

        setProfile(profileData);
        setNewUsername(profileData.username || "");

        return () => {
          subscription.unsubscribe();
        };
      } catch (error: any) {
        console.error('Profile auth error:', error);
        handleLogout();
      }
    };
    
    checkAuth();
  }, [navigate, toast]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (globalError) {
        console.warn('Global logout failed:', globalError);
      }

      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
      
      navigate("/login");
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({
        title: "Session expired",
        description: "Your session has expired. Please sign in again.",
      });
      navigate("/login");
    }
  };

  const handleUpdateUsername = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', session.user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, username: newUsername } : null);
      setIsEditing(false);
      
      toast({
        title: "Username updated",
        description: "Your username has been successfully updated.",
      });
    } catch (error: any) {
      console.error('Update username error:', error);
      toast({
        variant: "destructive",
        title: "Error updating username",
        description: error.message
      });
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="glass-card rounded-xl p-6 mb-6">
          <ProfileNav />
        </div>
        
        <div className="space-y-6 animate-fadeIn">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
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

            <div className="grid gap-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-20 h-20">
                  <User className="w-10 h-10" />
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="Enter username"
                          className="max-w-xs"
                        />
                        <Button onClick={handleUpdateUsername}>Save</Button>
                        <Button variant="outline" onClick={() => {
                          setIsEditing(false);
                          setNewUsername(profile?.username || "");
                        }}>Cancel</Button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-xl font-semibold">{profile?.username || "No username set"}</h2>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Joined {profile?.created_at ? format(new Date(profile.created_at), 'MMMM d, yyyy') : 'Unknown'}</span>
                  </div>
                </div>
              </div>

              <SellerStatus status={sellerStatus} />
              <DeleteAccount />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;