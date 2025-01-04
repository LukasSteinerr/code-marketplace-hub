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

interface PlatformSectionProps {
  form: UseFormReturn<ListCodeForm>;
}

export const PlatformSection = ({ form }: PlatformSectionProps) => {
  return (
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
  );
};