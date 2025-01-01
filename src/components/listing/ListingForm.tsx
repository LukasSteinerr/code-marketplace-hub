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
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ListCodeForm {
  title: string;
  description: string;
  price: number;
  platform: string;
  code: string;
  original_value: number;
  expiration_date: string;
  region: string;
}

export const ListingForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<ListCodeForm>({
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      platform: "",
      code: "",
      original_value: 0,
      expiration_date: "",
      region: "",
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
        code_text: values.code,
        original_value: values.original_value,
        expiration_date: values.expiration_date,
        region: values.region,
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

  const onSubmit = (values: ListCodeForm) => {
    createListing.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Game Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter game title" required />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="original_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Original Value (USD)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    min="0" 
                    step="0.01"
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    required
                  />
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
                <FormLabel>Selling Price (USD)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    min="0" 
                    step="0.01"
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="platform"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Platform</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Steam, PlayStation, Xbox" required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Region</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., NA, EU, Global" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="expiration_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expiration Date</FormLabel>
              <FormControl>
                <Input {...field} type="datetime-local" />
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
                <Input {...field} type="password" placeholder="Enter the game code" required />
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
            {createListing.isPending ? "Publishing..." : "Publish Listing"}
          </Button>
        </div>
      </form>
    </Form>
  );
};