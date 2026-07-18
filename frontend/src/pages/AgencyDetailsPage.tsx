import { Building2, FileText, GitBranch, Mail, MapPin, Phone, ShieldAlert, Wallet } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingBlock } from '@/components/ui/LoadingBlock'
import { Panel } from '@/components/ui/Panel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAgencyDetailsQuery } from '@/features/agencies/api'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 font-display text-2xl text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-300">{detail}</p>
    </div>
  )
}

export function AgencyDetailsPage() {
  const { id } = useParams()
  const agencyQuery = useAgencyDetailsQuery(id, true, Boolean(id))
  const agency = agencyQuery.data

  if (agencyQuery.isPending) {
    return <LoadingBlock label="Loading agency details..." />
  }

  if (agencyQuery.isError || !agency) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Agency details are not available"
        description="The requested agency could not be loaded from the current API scope."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agency details"
        title={`${agency.name} (${agency.code})`}
        description="Review hierarchy, profile data, connected branches, and the current agency financial snapshot."
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              to="/agencies"
            >
              Back to agencies
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              to={`/reports/agency?agencyId=${agency.id}`}
            >
              Open agency report
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <SummaryCard
          label="Total Branches"
          value={formatNumber(agency.summary.totalBranches)}
          detail="Connected branches included in the current scope."
        />
        <SummaryCard
          label="Total Groups"
          value={formatNumber(agency.summary.totalGroups)}
          detail="Groups visible in this agency summary."
        />
        <SummaryCard
          label="Total Pax"
          value={formatNumber(agency.summary.totalPax)}
          detail="Passenger volume across the current scope."
        />
        <SummaryCard
          label="Opening Balance"
          value={formatCurrency(agency.openingBalance)}
          detail="Stored opening balance for future accounting phases."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <SummaryCard
          label="Group Amount"
          value={formatCurrency(agency.summary.totalGroupAmount)}
          detail="Total group value across the selected agency scope."
        />
        <SummaryCard
          label="Payments Received"
          value={formatCurrency(agency.summary.totalPaymentsReceived)}
          detail="Total payments currently recorded for this scope."
        />
        <SummaryCard
          label="Outstanding Balance"
          value={formatCurrency(agency.summary.outstandingBalance)}
          detail="Current unpaid amount after applied allocations."
        />
        <SummaryCard
          label="Advance Balance"
          value={formatCurrency(agency.summary.advanceBalance)}
          detail="Unallocated credit currently held for future groups."
        />
        <SummaryCard
          label="Net Balance"
          value={formatCurrency(agency.summary.netBalance)}
          detail="Outstanding balance after deducting available advance credit."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <Panel title="Agency Profile" description="Core profile, hierarchy, and primary contact details.">
          <div className="space-y-4 text-sm text-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                label={agency.isActive ? 'Active' : 'Inactive'}
                tone={agency.isActive ? 'success' : 'warning'}
              />
              <StatusBadge
                label={agency.agencyType === 'PARENT' ? 'Parent Agency' : 'Branch Agency'}
                tone="neutral"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Category</p>
                <p className="mt-2 text-white">{agency.category || 'Not set'}</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Primary Contact</p>
                <p className="mt-2 text-white">{agency.primaryContactPerson || 'Not set'}</p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Parent Agency</p>
                <p className="mt-2 text-white">
                  {agency.parentAgency ? `${agency.parentAgency.name} (${agency.parentAgency.code})` : 'Top-level agency'}
                </p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Created</p>
                <p className="mt-2 text-white">{formatDate(agency.createdAt)}</p>
              </div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Address</p>
              <div className="mt-2 flex items-start gap-3 text-white">
                <MapPin className="mt-0.5 h-4 w-4 text-cyan-200" />
                <div>
                  <p>{agency.addressLine1 || 'Address line 1 not set'}</p>
                  <p>{agency.addressLine2 || 'Address line 2 not set'}</p>
                  <p>
                    {agency.city || 'City not set'} • {agency.state || 'State not set'} •{' '}
                    {agency.country || 'Country not set'} • {agency.postalCode || 'Postal code not set'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                  <Phone className="h-4 w-4" />
                  Phone Numbers
                </div>
                <div className="mt-3 space-y-2">
                  {agency.phoneNumbers.length === 0 ? (
                    <p className="text-sm text-slate-300">No phone numbers stored.</p>
                  ) : (
                    agency.phoneNumbers.map((phoneNumber) => (
                      <div key={phoneNumber.id} className="text-sm text-white">
                        {phoneNumber.label ? `${phoneNumber.label}: ` : ''}
                        {phoneNumber.phoneNumber}
                        {phoneNumber.isPrimary ? ' (Primary)' : ''}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                  <Mail className="h-4 w-4" />
                  Email Addresses
                </div>
                <div className="mt-3 space-y-2">
                  {agency.emailAddresses.length === 0 ? (
                    <p className="text-sm text-slate-300">No email addresses stored.</p>
                  ) : (
                    agency.emailAddresses.map((emailAddress) => (
                      <div key={emailAddress.id} className="text-sm text-white">
                        {emailAddress.label ? `${emailAddress.label}: ` : ''}
                        {emailAddress.email}
                        {emailAddress.isPrimary ? ' (Primary)' : ''}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="Hierarchy and Documents"
          description="Connected branches and stored document references."
        >
          <div className="space-y-5">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                <GitBranch className="h-4 w-4" />
                Connected Branches
              </div>
              {agency.branches.length === 0 ? (
                <p className="text-sm text-slate-300">No branches connected yet.</p>
              ) : (
                <div className="space-y-3">
                  {agency.branches.map((branch) => (
                    <div
                      key={branch.id}
                      className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {branch.name} ({branch.code})
                          </p>
                          <p className="mt-1 text-sm text-slate-300">
                            {branch.city || 'City not set'} • {branch.country || 'Country not set'}
                          </p>
                        </div>
                        <StatusBadge
                          label={branch.isActive ? 'Active' : 'Inactive'}
                          tone={branch.isActive ? 'success' : 'warning'}
                        />
                      </div>
                      <p className="mt-3 text-sm text-slate-300">
                        Groups {formatNumber(branch._count.groups)} • Payments{' '}
                        {formatNumber(branch._count.payments)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                <FileText className="h-4 w-4" />
                Documents
              </div>
              {agency.documents.length === 0 ? (
                <p className="text-sm text-slate-300">No document references stored yet.</p>
              ) : (
                <div className="space-y-3">
                  {agency.documents.map((document) => (
                    <div
                      key={document.id}
                      className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-white">{document.documentName}</p>
                      <p className="mt-1 text-sm text-slate-300">
                        {document.documentType || 'General document'}
                        {document.fileUrl ? ` • ${document.fileUrl}` : ''}
                      </p>
                      {document.notes ? (
                        <p className="mt-2 text-sm text-slate-300">{document.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        title="Phase 2 Notes"
        description="The financial foundation now includes advance-balance semantics and parent-paid branch allocation support."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
              <Building2 className="h-4 w-4" />
              Current Scope
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Parent and branch hierarchy, richer profile data, details page, and improved filters.
            </p>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
              <Wallet className="h-4 w-4" />
              Financial Summary
            </div>
            <p className="mt-3 text-sm text-slate-300">
              The summary now separates outstanding balance, advance balance, and net balance for finance-friendly review.
            </p>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
              <GitBranch className="h-4 w-4" />
              Consolidation
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Parent totals currently roll up branch groups and payments for viewing. Consolidated ledger and reports arrive in Phase 3.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  )
}
