"use client";

const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";

type MemberRow = {
  id: string;
  technician_id: string;
  technician_name: string;
  status: string;
  role: string;
};

type CrewMembersTableProps = {
  members: MemberRow[];
};

export function CrewMembersTable({ members }: CrewMembersTableProps) {
  return (
    <div className={cardClass}>
      <h2 className={cardTitleClass}>Crew members</h2>
      {members.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No members assigned.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="py-2 text-left font-medium text-[var(--muted)]">Technician</th>
                <th className="py-2 text-left font-medium text-[var(--muted)]">Role</th>
                <th className="py-2 text-left font-medium text-[var(--muted)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-[var(--card-border)] last:border-0">
                  <td className="py-2 text-[var(--foreground)]">{m.technician_name}</td>
                  <td className="py-2 text-[var(--muted)]">{m.role}</td>
                  <td className="py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.status === "active" ? "bg-[var(--accent)]/20 text-[var(--accent)]" : "bg-[var(--muted)]/20 text-[var(--muted)]"
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
