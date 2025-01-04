import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const VerifyCode = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const action = searchParams.get("action");

  useEffect(() => {
    const verifyCode = async () => {
      try {
        const { error } = await supabase.functions.invoke("verify-code", {
          body: { gameId: id, action },
        });

        if (error) throw error;

        if (action === "verify") {
          toast({
            title: "Code verified successfully",
            description: "The payment has been released to the seller.",
          });
        } else if (action === "dispute") {
          toast({
            title: "Issue reported",
            description: "We'll investigate and process your refund if needed.",
          });
        }

        navigate("/dashboard");
      } catch (error: any) {
        console.error("Verification error:", error);
        toast({
          variant: "destructive",
          title: "Error verifying code",
          description: error.message,
        });
      }
    };

    if (id && action) {
      verifyCode();
    }
  }, [id, action, navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Processing your request...</h1>
        <p className="text-muted-foreground">Please wait while we verify your game code.</p>
      </div>
    </div>
  );
};

export default VerifyCode;