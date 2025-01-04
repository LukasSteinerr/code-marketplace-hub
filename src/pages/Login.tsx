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
      }
    };
    
    clearSession();

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/dashboard");
      } else if (event === 'TOKEN_REFRESHED' && session) {
        navigate("/dashboard");
      } else if (event === 'SIGNED_OUT') {
        // Clear local storage and session storage
        localStorage.clear();
        sessionStorage.clear();
      }
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

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
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary))',
                  },
                },
              },
            }}
            providers={["google"]}
            redirectTo={window.location.origin}
            onError={(error) => {
              console.error('Auth error:', error);
              toast({
                title: "Authentication Error",
                description: error.message,
                variant: "destructive",
              });
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;