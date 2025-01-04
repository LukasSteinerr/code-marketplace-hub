import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const DeleteAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      // Delete profile data (this will cascade to sellers and game_codes due to FK constraints)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      // Delete the user's auth account
      const { error: authError } = await supabase.auth.admin.deleteUser(
        session.user.id
      );

      if (authError) throw authError;

      // Sign out
      await supabase.auth.signOut();
      navigate('/login');

      toast({
        title: "Account deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });
    } catch (error: any) {
      console.error('Delete account error:', error);
      toast({
        variant: "destructive",
        title: "Error deleting account",
        description: error.message
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="border-t pt-4">
      <label className="text-sm font-medium text-muted-foreground">Delete Account</label>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1">
          <p className="font-medium text-destructive">Delete your account</p>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account
                and remove all associated data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};