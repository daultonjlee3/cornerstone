export const metadata = {
  title: "Dispatch | Cornerstone Tech",
  description: "Scheduling & routing",
};

export default function DispatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {children}
    </div>
  );
}
