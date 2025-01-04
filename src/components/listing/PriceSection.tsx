import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { ListCodeForm } from "./ListingForm";

interface PriceSectionProps {
  form: UseFormReturn<ListCodeForm>;
}

export const PriceSection = ({ form }: PriceSectionProps) => {
  return (
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
  );
};