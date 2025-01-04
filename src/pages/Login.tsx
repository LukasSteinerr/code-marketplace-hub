import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Clear any existing session data on mount
    const clearSession = async () => {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error('Error clearing session:', error);
        toast({
          title: "Session Error",
          description: error.message,
          variant: "destructive",
        });
      }
    };
    
    clearSession();

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event); // Add this to help debug
      if (event === 'SIGNED_IN' && session) {
        navigate("/dashboard");
      } else if (event === 'TOKEN_REFRESHED' && session) {
        navigate("/dashboard");
      } else if (event === 'SIGNED_OUT') {
        // Clear local storage and session storage
        localStorage.clear();
        sessionStorage.clear();
        toast({
          title: "Signed Out",
          description: "You have been successfully signed out",
          variant: "default",
        });
      } else if (event === 'USER_UPDATED') {
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated",
          variant: "default",
        });
      }
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md space-y-8 animate-fadeIn">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-foreground mb-2">GameKeys Market</h2>
          <p className="text-muted-foreground">Your trusted game code marketplace</p>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow-lg border border-border">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#4F46E5',
                    brandAccent: '#4338CA',
                    brandButtonText: 'white',
                  },
                },
              },
              style: {
                button: {
                  borderRadius: '6px',
                  height: '40px',
                },
                container: {
                  gap: '16px',
                },
              },
            }}
            providers={["google"]}
            redirectTo={window.location.origin}
            onlyThirdPartyProviders
          />
        </div>
      </div>
    </div>
  );
};

export default Login;