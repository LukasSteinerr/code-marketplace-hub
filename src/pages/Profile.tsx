import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

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

  const getSellerStatusDisplay = () => {
    if (!sellerStatus) return {
      icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
      text: "Not registered as a seller",
      description: "Register as a seller to start listing game codes"
    };

    switch (sellerStatus) {
      case 'active':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: "Active Seller",
          description: "You can list and sell game codes"
        };
      case 'pending':
        return {
          icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
          text: "Pending Seller",
          description: "Your seller application is being processed"
        };
      case 'onboarding':
        return {
          icon: <AlertCircle className="h-5 w-5 text-blue-500" />,
          text: "Onboarding",
          description: "Please complete your seller onboarding"
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          text: "Unknown Status",
          description: "Please contact support"
        };
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  const statusDisplay = getSellerStatusDisplay();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink
                  className={navigationMenuTriggerStyle()}
                  onClick={() => navigate('/dashboard')}
                >
                  Dashboard
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink
                  className={navigationMenuTriggerStyle()}
                  onClick={() => navigate('/list-code')}
                >
                  List Code
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

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
            <div className="border-t pt-4">
              <label className="text-sm font-medium text-muted-foreground">Seller Status</label>
              <div className="flex items-center gap-2 mt-2">
                {statusDisplay.icon}
                <div>
                  <p className="font-medium">{statusDisplay.text}</p>
                  <p className="text-sm text-muted-foreground">{statusDisplay.description}</p>
                </div>
              </div>
            </div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;