import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Button } from "@/components/ui/button";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if there's an active session first
    const checkAndClearSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        try {
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error('Error during sign out:', error);
          }
        } catch (err) {
          console.error('Error during sign out:', err);
        }
      }
    };
    
    checkAndClearSession();

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

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      
      if (error) {
        console.error('Error signing in with Google:', error);
        if (error.message.includes('user_already_exists')) {
          toast({
            title: "Account Exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "default",
          });
        } else {
          toast({
            title: "Sign In Error",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error('Error during Google sign in:', err);
      toast({
        title: "Sign In Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md space-y-8 animate-fadeIn">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-foreground mb-2">GameKeys Market</h2>
          <p className="text-muted-foreground">Your trusted game code marketplace</p>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow-lg border border-border space-y-6">
          <Button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-2"
            variant="outline"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'rgb(var(--primary))',
                    brandAccent: 'rgb(var(--primary))',
                    inputBackground: 'rgb(var(--background))',
                    inputText: 'rgb(var(--foreground))',
                    inputBorder: 'rgb(var(--border))',
                    inputBorderFocus: 'rgb(var(--ring))',
                    inputBorderHover: 'rgb(var(--border))',
                    inputPlaceholder: 'rgb(var(--muted-foreground))',
                  },
                },
              },
              className: {
                container: 'space-y-4',
                label: 'text-foreground',
                button: 'bg-primary text-primary-foreground hover:bg-primary/90',
                input: 'bg-background text-foreground border-input',
              },
            }}
            providers={[]}
            localization={{
              variables: {
                sign_up: {
                  email_label: 'Email',
                  password_label: 'Password',
                  button_label: 'Sign up',
                  loading_button_label: 'Signing up...',
                  social_provider_text: 'Sign in with {{provider}}',
                  link_text: "Don't have an account? Sign up",
                  confirmation_text: 'Check your email for the confirmation link',
                },
                sign_in: {
                  email_label: 'Email',
                  password_label: 'Password',
                  button_label: 'Sign in',
                  loading_button_label: 'Signing in...',
                  social_provider_text: 'Sign in with {{provider}}',
                  link_text: 'Already have an account? Sign in',
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;