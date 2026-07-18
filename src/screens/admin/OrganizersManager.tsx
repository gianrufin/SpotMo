import { useState } from 'react';
import {
  ArrowLeft,
  Users,
  Check,
  X,
  Pencil,
  Trash2,
  Plus,
  Inbox,
  AlertCircle,
  ShieldPlus,
  ShieldMinus,
  Instagram,
} from 'lucide-react';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { SegmentedTabs } from '../../components/common/SegmentedTabs';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type { OrganizerRow } from '../../lib/organizerTypes';
import { toSocialHref } from '../../lib/organizerAccess';

type Result = { ok: boolean; error?: string };

interface OrganizersManagerProps {
  organizers: OrganizerRow[];
  onBack: () => void;
  onApprove: (id: string) => Promise<Result>;
  onRevoke: (id: string) => Promise<Result>;
  onUpdateName: (id: string, orgName: string) => Promise<Result>;
  onRemove: (id: string) => Promise<Result>;
  onAdd: (email: string, orgName: string) => Promise<Result>;
  /** Whether the given user_id currently holds admin access. */
  isAdminUser: (userId: string) => boolean;
  /** Whether the given user_id is allowed to be demoted (not you, not the founder). */
  canDemote: (userId: string) => boolean;
  onPromote: (userId: string) => Promise<Result>;
  onDemote: (userId: string) => Promise<Result>;
}

type Filter = 'pending' | 'approved' | 'revoked' | 'all';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-brandsoft text-brandsoftfg',
  revoked: 'bg-red-100 text-red-600',
};

export function OrganizersManager({
  organizers,
  onBack,
  onApprove,
  onRevoke,
  onUpdateName,
  onRemove,
  onAdd,
  isAdminUser,
  canDemote,
  onPromote,
  onDemote,
}: OrganizersManagerProps) {
  const [filter, setFilter] = useState<Filter>('pending');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const list =
    filter === 'all' ? organizers : organizers.filter((o) => o.status === filter);
  const pendingCount = organizers.filter((o) => o.status === 'pending').length;

  async function runAction(id: string, action: () => Promise<Result>) {
    setBusyId(id);
    setError('');
    const result = await action();
    setBusyId(null);
    if (!result.ok) setError(result.error ?? 'Something went wrong.');
  }

  function startEdit(o: OrganizerRow) {
    setEditingId(o.id);
    setEditName(o.org_name ?? '');
  }
  async function saveEdit(id: string) {
    await runAction(id, () => onUpdateName(id, editName));
    setEditingId(null);
  }
  async function submitAdd() {
    if (!/.+@.+\..+/.test(addEmail)) return;
    setError('');
    const result = await onAdd(addEmail, addName);
    if (!result.ok) {
      setError(result.error ?? 'Something went wrong.');
      return;
    }
    setAddEmail('');
    setAddName('');
    setAdding(false);
    setFilter('approved');
  }

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="flex items-center gap-3 border-b border-hairline px-4 py-4">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink transition active:scale-90"
          aria-label="Back"
        >
          <ArrowLeft size={19} strokeWidth={1.9} />
        </button>
        <div>
          <p className="font-serif text-xl leading-none text-ink">Organizers</p>
          <p className="text-[12px] text-muted">{pendingCount} awaiting review</p>
        </div>
      </header>

      <div className="px-5 py-3">
        <SegmentedTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'revoked', label: 'Revoked' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>

      {error && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-[12.5px] text-red-600">
          <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {organizers.length === 0 ? (
          <EmptyState
            icon={<Users size={26} strokeWidth={1.6} />}
            title="No organizers yet"
            message="Requests submitted from the app will show up here for review."
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Inbox size={26} strokeWidth={1.6} />}
            title={`No ${filter} organizers`}
            message="Switch tabs to see organizers in other states."
          />
        ) : (
          <div className="space-y-3 pt-1">
            {list.map((o) => (
              <div key={o.id} className="rounded-3xl bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] capitalize ${STATUS_STYLE[o.status]}`}
                      >
                        {o.status}
                      </span>
                      {o.user_id && (
                        <span className="text-[10.5px] text-muted">
                          account created
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-[14.5px] text-ink">{o.email}</p>
                    {editingId === o.id ? (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Organizer / venue name"
                          className="input flex-1 py-2 text-[13px]"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <p className="truncate text-[13px] text-muted">
                        {o.org_name || 'No name set yet'}
                      </p>
                    )}
                    {o.instagram_url && (
                      <a
                        href={toSocialHref(o.instagram_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-brand"
                      >
                        <Instagram size={13} strokeWidth={1.9} className="shrink-0" />
                        <span className="truncate">{o.instagram_url}</span>
                      </a>
                    )}
                    {o.request_note && (
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                        “{o.request_note}”
                      </p>
                    )}
                    {o.user_id && isAdminUser(o.user_id) && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[10px] text-onink">
                        <ShieldPlus size={11} strokeWidth={2.2} /> Admin
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-hairline pt-3">
                  {editingId === o.id ? (
                    <>
                      <button
                        onClick={() => saveEdit(o.id)}
                        disabled={busyId === o.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-ink py-2 text-[13px] text-onink disabled:opacity-50"
                      >
                        <Check size={14} strokeWidth={2.2} /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface py-2 text-[13px] text-ink"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {o.status === 'pending' && (
                        <button
                          onClick={() => runAction(o.id, () => onApprove(o.id))}
                          disabled={busyId === o.id}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] text-brand disabled:opacity-50"
                        >
                          <Check size={15} strokeWidth={2.2} /> Approve
                        </button>
                      )}
                      {o.status === 'approved' && (
                        <button
                          onClick={() => runAction(o.id, () => onRevoke(o.id))}
                          disabled={busyId === o.id}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] text-muted disabled:opacity-50"
                        >
                          <X size={15} strokeWidth={2.2} /> Revoke
                        </button>
                      )}
                      {o.status === 'revoked' && (
                        <button
                          onClick={() => runAction(o.id, () => onApprove(o.id))}
                          disabled={busyId === o.id}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] text-brand disabled:opacity-50"
                        >
                          <Check size={15} strokeWidth={2.2} /> Re-approve
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(o)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] text-ink"
                      >
                        <Pencil size={13} strokeWidth={1.9} /> Edit name
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(o.id)}
                        disabled={busyId === o.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] text-red-500 disabled:opacity-50"
                      >
                        <Trash2 size={15} strokeWidth={1.9} /> Delete
                      </button>
                    </>
                  )}
                </div>

                {o.status === 'approved' && o.user_id && editingId !== o.id && (
                  <div className="mt-2 border-t border-hairline pt-2">
                    {isAdminUser(o.user_id) ? (
                      canDemote(o.user_id) && (
                        <button
                          onClick={() => runAction(o.id, () => onDemote(o.user_id as string))}
                          disabled={busyId === o.id}
                          className="flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[13px] text-muted disabled:opacity-50"
                        >
                          <ShieldMinus size={14} strokeWidth={1.9} /> Remove admin
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => runAction(o.id, () => onPromote(o.user_id as string))}
                        disabled={busyId === o.id}
                        className="flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[13px] text-ink"
                      >
                        <ShieldPlus size={14} strokeWidth={1.9} /> Make admin
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add organizer sheet */}
      {adding ? (
        <div className="absolute inset-x-0 bottom-0 space-y-3 rounded-t-3xl border-t border-hairline bg-card/95 p-4 pb-5 shadow-float backdrop-blur">
          <p className="font-serif text-lg text-ink">Add organizer</p>
          <input
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="email@example.com"
            className="input"
            autoFocus
          />
          <input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="Organizer / venue name (optional)"
            className="input"
          />
          <div className="flex gap-2">
            <PrimaryButton full onClick={submitAdd} disabled={!/.+@.+\..+/.test(addEmail)}>
              Add as approved
            </PrimaryButton>
            <button
              onClick={() => setAdding(false)}
              className="shrink-0 rounded-full bg-surface px-4 text-[14px] text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 border-t border-hairline bg-card/90 p-4 pb-5 backdrop-blur">
          <PrimaryButton full icon={<Plus size={18} strokeWidth={2.2} />} onClick={() => setAdding(true)}>
            Add Organizer
          </PrimaryButton>
        </div>
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete this organizer?"
          message="This removes them from the roster permanently. Their past events won't be affected, but they'll need to request access again to submit new ones."
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => {
            const id = confirmDeleteId;
            setConfirmDeleteId(null);
            void runAction(id, () => onRemove(id));
          }}
        />
      )}
    </div>
  );
}
