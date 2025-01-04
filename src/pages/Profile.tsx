import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProfileNav } from "@/components/profile/ProfileNav";
import { SellerStatus } from "@/components/profile/SellerStatus";
import { DeleteAccount } from "@/components/profile/DeleteAccount";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }

        // Get profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        // Get seller status
        const { data: sellerData, error: sellerError } = await supabase
          .from('sellers')
          .select('status')
          .eq('id', user.id)
          .maybeSingle();

        if (sellerError) {
          throw sellerError;
        }

        // If no profile exists, create one
        if (!profileData) {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([{ 
              id: user.id,
              username: user.email?.split('@')[0] || null
            }])
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }
          setProfile(newProfile);
        } else {
          setProfile(profileData);
        }

        setSellerStatus(sellerData?.status || null);
        setLoading(false);
      } catch (error: any) {
        console.error('Error fetching profile:', error);
        toast({
          variant: "destructive",
          title: "Error loading profile",
          description: error.message
        });
        setLoading(false);
      }
    };

    getProfile();
  }, [navigate, toast]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    } else {
      navigate('/login');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <ProfileNav />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-lg">{profile?.email || 'Not available'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Username</label>
              <p className="text-lg">{profile?.username || 'Not set'}</p>
            </div>
            
            <SellerStatus status={sellerStatus} />

            <div>
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="w-full sm:w-auto"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>

            <DeleteAccount />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;