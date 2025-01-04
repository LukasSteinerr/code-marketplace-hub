interface GameDescriptionProps {
  description: string | null;
}

export const GameDescription = ({ description }: GameDescriptionProps) => {
  if (!description) return null;

  return (
    <div className="bg-card/10 backdrop-blur-sm rounded-lg p-6 space-y-4">
      <h2 className="text-xl font-semibold">Description</h2>
      <p className="text-muted-foreground whitespace-pre-wrap">{description}</p>
    </div>
  );
};