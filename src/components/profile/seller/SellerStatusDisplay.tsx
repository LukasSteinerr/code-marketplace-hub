import { AlertCircle, CheckCircle } from "lucide-react";

interface StatusDisplayProps {
  status: string | null;
}

interface StatusInfo {
  icon: JSX.Element;
  text: string;
  description: string;
  showStartButton: boolean;
  showRestartButton: boolean;
}

export const getStatusDisplay = (status: string | null): StatusInfo => {
  if (!status) return {
    icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
    text: "Not registered as a seller",
    description: "Register as a seller to start listing game codes",
    showStartButton: true,
    showRestartButton: true
  };

  switch (status) {
    case 'active':
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        text: "Active Seller",
        description: "You can list and sell game codes",
        showStartButton: false,
        showRestartButton: false
      };
    case 'pending':
      return {
        icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
        text: "Pending Seller",
        description: "Your seller application is being processed",
        showStartButton: false,
        showRestartButton: true
      };
    case 'onboarding':
      return {
        icon: <AlertCircle className="h-5 w-5 text-blue-500" />,
        text: "Complete Onboarding",
        description: "Please complete your seller onboarding",
        showStartButton: true,
        showRestartButton: true
      };
    default:
      return {
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
        text: "Unknown Status",
        description: "Please contact support",
        showStartButton: false,
        showRestartButton: true
      };
  }
};

export const SellerStatusDisplay = ({ status }: StatusDisplayProps) => {
  const statusInfo = getStatusDisplay(status);
  
  return (
    <div className="flex items-center gap-2">
      {statusInfo.icon}
      <div className="flex-1">
        <p className="font-medium bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {statusInfo.text}
        </p>
        <p className="text-sm text-muted-foreground">
          {statusInfo.description}
        </p>
      </div>
    </div>
  );
};