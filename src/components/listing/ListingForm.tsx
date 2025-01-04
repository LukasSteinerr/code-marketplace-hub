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
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GameDetailsSection } from "./GameDetailsSection";
import { PriceSection } from "./PriceSection";
import { PlatformSection } from "./PlatformSection";
import { GameTitle } from "@/constants/games";

export interface ListCodeForm {
  title: GameTitle;
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
      title: undefined,
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
        <GameDetailsSection form={form} />
        <PriceSection form={form} />
        <PlatformSection form={form} />

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