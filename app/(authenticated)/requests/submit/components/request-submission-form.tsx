"use client";

import { useActionState, useMemo, useState } from "react";
import { submitWorkRequest, type WorkRequestActionState } from "../../actions";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";

type CompanyOption = { id: string; name: string };
type AssetOption = { id: string; name: string; company_id: string | null };

type RequestSubmissionFormProps = {
  companies: CompanyOption[];
  assets: AssetOption[];
  defaultRequesterName: string;
  defaultRequesterEmail: string;
};

const INITIAL_STATE: WorkRequestActionState = {};

export function RequestSubmissionForm({
  companies,
  assets,
  defaultRequesterName,
  defaultRequesterEmail,
}: RequestSubmissionFormProps) {
  const [state, formAction, pending] = useActionState(submitWorkRequest, INITIAL_STATE);
  const [companyId, setCompanyId] = useState(companies.length === 1 ? companies[0]?.id ?? "" : "");

  const scopedAssets = useMemo(() => {
    if (!companyId) return assets;
    return assets.filter((asset) => asset.company_id == null || asset.company_id === companyId);
  }, [assets, companyId]);

  return (
    <Card className="w-full min-w-0 max-w-3xl">
      <CardHeader className="space-y-1.5">
        <CardTitle>New maintenance request</CardTitle>
        <CardDescription>
          Requests start as <span className="font-medium">submitted</span> and can be approved, rejected, or converted.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error ? (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700">{state.error}</div>
          ) : null}
          {state.success ? (
            <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
              Request submitted successfully.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="ui-label">Requester name</span>
              <input
                name="requester_name"
                defaultValue={defaultRequesterName}
                required
                className="ui-input"
                placeholder="Your full name"
              />
            </label>
            <label className="space-y-1">
              <span className="ui-label">Requester email</span>
              <input
                name="requester_email"
                type="email"
                defaultValue={defaultRequesterEmail}
                required
                className="ui-input"
                placeholder="name@company.com"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="ui-label">Company</span>
              <select
                name="company_id"
                value={companyId}
                onChange={(event) => setCompanyId(event.target.value)}
                className="ui-select"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="ui-label">Priority</span>
              <select name="priority" defaultValue="medium" className="ui-select">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </label>
          </div>

          <label className="space-y-1">
            <span className="ui-label">Location</span>
            <input
              name="location"
              required
              className="ui-input"
              placeholder="Property / building / unit / room"
            />
          </label>

          <label className="space-y-1">
            <span className="ui-label">Asset (optional)</span>
            <select name="asset_id" className="ui-select" defaultValue="">
              <option value="">No linked asset</option>
              {scopedAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="ui-label">Description</span>
            <textarea
              name="description"
              required
              rows={5}
              className="ui-textarea"
              placeholder="Describe the issue, symptoms, and urgency."
            />
          </label>

          <label className="space-y-1">
            <span className="ui-label">Photo (optional)</span>
            <input
              name="photo"
              type="file"
              accept="image/*"
              className="ui-input w-full min-w-0 file:mr-3 file:min-h-[44px] file:rounded-md file:border file:border-[var(--card-border)] file:bg-[var(--card)] file:px-3 file:py-2 file:text-sm file:font-medium"
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="submit" disabled={pending} className="min-h-[44px] min-w-[120px] sm:min-w-0">
              {pending ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
