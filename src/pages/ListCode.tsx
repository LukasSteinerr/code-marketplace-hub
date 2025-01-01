import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";

interface ListCodeForm {
  title: string;
  description: string;
  price: number;
  platform: string;
  code: string;
}

const ListCode = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<ListCodeForm>({
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      platform: "",
      code: "",
    },
  });

  const { data: seller } = useQuery({
    queryKey: ["seller-status"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: seller } = await supabase
        .from("sellers")
        .select("*")
        .eq("id", user.id)
        .single();

      return seller;
    },
  });

  const createSellerAccount = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/create-connect-account", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to create Stripe Connect account");
      }
      
      const { url } = await response.json();
      window.location.href = url;
    },
  });

  const createListing = useMutation({
    mutationFn: async (values: ListCodeForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("game_codes").insert({
        seller_id: user.id,
        title: values.title,
        description: values.description,
        price: values.price,
        platform: values.platform,
        status: "available",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your game code has been listed!",
      });
      navigate("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!seller) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-6">Become a Seller</h1>
          <p className="mb-6">To list game codes, you need to complete the seller onboarding process.</p>
          <Button 
            onClick={() => createSellerAccount.mutate()}
            disabled={createSellerAccount.isPending}
          >
            {createSellerAccount.isPending ? "Setting up..." : "Set up Stripe Connect"}
          </Button>
        </div>
      </div>
    );
  }

  if (seller.status === "pending" || seller.status === "onboarding") {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-6">Complete Your Seller Profile</h1>
          <p className="mb-6">Please complete your Stripe Connect onboarding to start selling.</p>
          <Button 
            onClick={() => createSellerAccount.mutate()}
            disabled={createSellerAccount.isPending}
          >
            {createSellerAccount.isPending ? "Setting up..." : "Complete Stripe Setup"}
          </Button>
        </div>
      </div>
    );
  }

  const onSubmit = (values: ListCodeForm) => {
    createListing.mutate(values);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">List a Game Code</h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter game title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Enter game description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (USD)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      min="0" 
                      step="0.01"
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Steam, PlayStation, Xbox" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Game Code</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="Enter the game code" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createListing.isPending}
              >
                {createListing.isPending ? "Creating..." : "Create Listing"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default ListCode;