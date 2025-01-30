import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GAME_TITLES } from "@/constants/games";
import { UseFormReturn } from "react-hook-form";
import { ListCodeForm } from "./ListingForm";

interface GameDetailsSectionProps {
  form: UseFormReturn<ListCodeForm>;
}

export const GameDetailsSection = ({ form }: GameDetailsSectionProps) => {
  return (
    <>
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Game Title</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a game" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="bg-card border-border">
                {GAME_TITLES.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
    </>
  );
};