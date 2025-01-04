import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProfileNav } from "@/components/profile/ProfileNav";
import { SellerStatus } from "@/components/profile/SellerStatus";
import { DeleteAccount } from "@/components/profile/DeleteAccount";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      setUserEmail(session.user.email || "");

      // Try to get existing profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profile) {
        // Create profile if it doesn't exist
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{ id: session.user.id }]);

        if (insertError) throw insertError;
      } else {
        setUsername(profile.username);
      }
    } catch (error: any) {
      console.error('Error loading user data!', error.message);
      toast({
        variant: "destructive",
        title: "Error loading profile",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      setIsSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const updates = {
        id: session.user.id,
        username,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating profile",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <ProfileNav />
      
      <div className="grid gap-6">
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Email
              </label>
              <Input
                type="text"
                disabled
                value={userEmail}
                className="max-w-md"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Username
              </label>
              <Input
                type="text"
                value={username || ""}
                onChange={(e) => setUsername(e.target.value)}
                className="max-w-md"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={updateProfile}
                disabled={loading || isSaving}
              >
                {isSaving ? "Saving..." : "Update Profile"}
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
              >
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