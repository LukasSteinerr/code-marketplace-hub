import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

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
      console.log('Auth event:', event, 'Session:', session);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in successfully:', session.user);
        navigate("/dashboard");
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('Token refreshed:', session);
        navigate("/dashboard");
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        localStorage.clear();
        sessionStorage.clear();
        toast({
          title: "Signed Out",
          description: "You have been successfully signed out",
          variant: "default",
        });
      }
    });

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
                    brand: 'rgb(var(--primary))',
                    brandAccent: 'rgb(var(--primary))',
                  },
                },
              },
            }}
            providers={[]}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;