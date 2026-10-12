'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Category, Transaction } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { fingerprint } from '../lib/integrations/ledger';

interface ImportTabProps {
  categories: Category[];
  transactions: Transaction[];
  onImport: (transactions: Omit<Transaction, 'id'>[]) => void;
  onLedgerRefresh: () => Promise<void> | void;
}

interface IntegrationStatus {
  plaid: {
    enabled: boolean;
    configured: boolean;
    environment: string | null;
    products: string[];
    webhookConfigured: boolean;
    reason?: string;
  };
  ocr: {
    enabled: boolean;
    configured: boolean;
    provider: 'mistral' | 'gemini' | null;
    model: string | null;
    reason?: string;
  };
  connections: PlaidConnection[];
}

interface PlaidConnection {
  itemId: string;
  institutionName: string | null;
  accounts: { name: string; mask: string | null; type: string | null }[];
  connectedAt: string;
  lastSyncedAt: string | null;
}

interface ReviewRow {
  key: string;
  selected: boolean;
  duplicate: boolean;
  date: string;
  description: string;
  amount: string;
  type: 'income' | 'expense';
  category: string;
}

interface ExtractResponse {
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category?: string;
  }>;
  method: 'pdf-text' | 'mistral-ocr' | 'gemini';
  provider: 'mistral' | 'gemini';
  warnings: string[];
}

function methodCopy(result: ExtractResponse): string {
  if (result.method === 'pdf-text') {
    const reader = result.provider === 'mistral' ? 'Mistral' : 'Gemini';
    return `Used the text already in the PDF, then structured it with ${reader}. The page images were not sent to OCR.`;
  }
  if (result.method === 'mistral-ocr') return 'Read the scan with Mistral OCR.';
  return 'Read the image with Gemini.';
}

export default function ImportTab({ categories, transactions, onImport, onLedgerRefresh }: ImportTabProps) {
  const { theme } = useTheme();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [methodNote, setMethodNote] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [plaidMessage, setPlaidMessage] = useState<string | null>(null);
  const [plaidError, setPlaidError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadStatus = async () => {
    const response = await fetch('/api/integrations');
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Could not load integrations');
    setStatus(body);
  };

  useEffect(() => {
    loadStatus().catch((error: unknown) => {
      setStatusError(error instanceof Error ? error.message : 'Could not load integrations');
    });
  }, []);

  const cardStyle = {
    backgroundColor: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.textPrimary,
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setExtracting(true);
    setExtractError(null);
    setMethodNote(null);
    setWarnings([]);
    setRows([]);
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/import/extract', { method: 'POST', body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not read that file');
      const result = body as ExtractResponse;
      const existing = new Set(transactions.map((transaction) => fingerprint(transaction)));
      setRows(result.transactions.map((transaction, index) => {
        const duplicate = existing.has(fingerprint(transaction));
        return {
          key: `${transaction.date}-${index}-${transaction.description}`,
          selected: !duplicate,
          duplicate,
          date: transaction.date,
          description: transaction.description,
          amount: String(transaction.amount),
          type: transaction.type,
          category: transaction.category || '',
        };
      }));
      setMethodNote(methodCopy(result));
      setWarnings(result.warnings || []);
    } catch (error) {
      setExtractError(error instanceof Error ? error.message : 'Could not read that file');
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const updateRow = (key: string, patch: Partial<ReviewRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const commitRows = () => {
    const chosen = rows.filter((row) => row.selected);
    const imported: Omit<Transaction, 'id'>[] = [];
    for (const row of chosen) {
      const amount = Number(row.amount);
      if (!row.description.trim() || !row.date || !Number.isFinite(amount) || amount <= 0) continue;
      imported.push({
        description: row.description.trim(),
        amount,
        type: row.type,
        date: row.date,
        category: row.category || undefined,
        source: 'import',
      });
    }
    if (imported.length === 0) {
      setExtractError('Select at least one row with a date, description, and amount.');
      return;
    }
    onImport(imported);
    setRows([]);
    setMethodNote(null);
    setWarnings([]);
    setExtractError(null);
  };

  const refreshAfterPlaid = async (message: string) => {
    setPlaidMessage(message);
    setPlaidError(null);
    await loadStatus();
    await onLedgerRefresh();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg p-6" style={cardStyle}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold">Statement or receipt</h2>
            <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
              Digital PDFs use the text already in the file. Photos and scans go through Mistral OCR or Gemini, whichever key you set.
            </p>
          </div>
          <StatusPill
            ready={Boolean(status?.ocr.configured)}
            label={!status ? 'Checking' : status.ocr.configured
              ? status.ocr.provider === 'mistral' ? 'Mistral OCR' : 'Gemini'
              : 'Not configured'}
          />
        </div>

        {status && !status.ocr.configured && (
          <ConfigNote
            reason={status.ocr.reason}
            lines={[
              'OCR_PROVIDER=mistral',
              'MISTRAL_API_KEY=...',
              '# or OCR_PROVIDER=gemini and GEMINI_API_KEY',
            ]}
          />
        )}

        <label
          className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 cursor-pointer"
          style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}
        >
          <span className="font-medium" style={{ color: theme.colors.textPrimary }}>
            {extracting ? 'Reading document...' : 'Choose a PDF or image'}
          </span>
          <span className="text-sm mt-1">PDF, JPEG, PNG, or WebP. 4 MB max.</span>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            disabled={extracting || !status?.ocr.configured}
            onChange={(event) => onFile(event.target.files?.[0])}
          />
        </label>

        {extractError && <p className="mt-3 text-sm" style={{ color: theme.colors.error }}>{extractError}</p>}
        {methodNote && <p className="mt-3 text-sm" style={{ color: theme.colors.textSecondary }}>{methodNote}</p>}
        {warnings.map((warning) => (
          <p key={warning} className="mt-1 text-sm" style={{ color: theme.colors.warning }}>{warning}</p>
        ))}

        {rows.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                {rows.filter((row) => row.selected).length} of {rows.length} selected. Nothing is saved until you import.
              </p>
              <button
                type="button"
                onClick={commitRows}
                className="px-4 py-2 rounded-lg font-medium"
                style={{ backgroundColor: theme.colors.primary, color: '#ffffff' }}
              >
                Import selected
              </button>
            </div>
            {rows.map((row) => (
              <ReviewRowEditor
                key={row.key}
                row={row}
                categories={categories}
                onChange={(patch) => updateRow(row.key, patch)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg p-6" style={cardStyle}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold">Bank connection</h2>
            <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
              Optional. Plaid stays off until its keys are set. Transactions you already imported are kept if you disconnect.
            </p>
          </div>
          <StatusPill
            ready={Boolean(status?.plaid.configured)}
            label={!status ? 'Checking' : status.plaid.configured
              ? `Plaid ${status.plaid.environment}`
              : 'Not configured'}
          />
        </div>

        {statusError && <p className="text-sm mb-3" style={{ color: theme.colors.error }}>{statusError}</p>}

        {status && !status.plaid.configured && (
          <ConfigNote
            reason={status.plaid.reason}
            lines={[
              'PLAID_CLIENT_ID=...',
              'PLAID_SECRET=...',
              'PLAID_ENV=sandbox',
              '# optional: PLAID_WEBHOOK_URL, PLAID_REDIRECT_URI, PLAID_PRODUCTS',
            ]}
          />
        )}

        {status?.plaid.configured && (
          <PlaidConnect
            onConnected={async (summary) => {
              const waiting = summary.productNotReady
                ? 'Connected. Plaid is still preparing transactions. Sync again in a minute.'
                : `Connected. Added ${summary.added}, updated ${summary.updated}, removed ${summary.removed}.`;
              await refreshAfterPlaid(waiting);
            }}
            onError={setPlaidError}
          />
        )}

        {plaidMessage && <p className="mt-3 text-sm" style={{ color: theme.colors.textSecondary }}>{plaidMessage}</p>}
        {plaidError && <p className="mt-3 text-sm" style={{ color: theme.colors.error }}>{plaidError}</p>}

        <div className="mt-4 space-y-3">
          {(status?.connections || []).map((connection) => (
            <div key={connection.itemId} className="rounded-lg p-4" style={{ backgroundColor: theme.colors.background }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{connection.institutionName || 'Connected institution'}</p>
                  <p className="text-sm mt-1" style={{ color: theme.colors.textSecondary }}>
                    {connection.accounts.map((account) => account.mask ? `${account.name} ••${account.mask}` : account.name).join(', ') || 'No accounts returned'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: theme.colors.textMuted }}>
                    {connection.lastSyncedAt ? `Last sync ${new Date(connection.lastSyncedAt).toLocaleString()}` : 'Not synced yet'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyItem === connection.itemId}
                    onClick={async () => {
                      setBusyItem(connection.itemId);
                      setPlaidError(null);
                      try {
                        const response = await fetch('/api/integrations/plaid/sync', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ itemId: connection.itemId }),
                        });
                        const body = await response.json();
                        if (!response.ok) throw new Error(body.error || 'Sync failed');
                        const waiting = body.productNotReady
                          ? 'Plaid is still preparing transactions. Try again in a minute.'
                          : `Added ${body.added}, updated ${body.updated}, removed ${body.removed}.`;
                        await refreshAfterPlaid(waiting);
                      } catch (error) {
                        setPlaidError(error instanceof Error ? error.message : 'Sync failed');
                      } finally {
                        setBusyItem(null);
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: theme.colors.primary, color: '#ffffff' }}
                  >
                    {busyItem === connection.itemId ? 'Syncing...' : 'Sync'}
                  </button>
                  <button
                    type="button"
                    disabled={busyItem === connection.itemId}
                    onClick={async () => {
                      setBusyItem(connection.itemId);
                      setPlaidError(null);
                      try {
                        const response = await fetch('/api/integrations/plaid/items', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ itemId: connection.itemId }),
                        });
                        const body = await response.json();
                        if (!response.ok) throw new Error(body.error || 'Could not disconnect');
                        setStatus((current) => current ? { ...current, connections: body.connections } : current);
                        setPlaidMessage('Disconnected. Transactions already in the ledger were left in place.');
                      } catch (error) {
                        setPlaidError(error instanceof Error ? error.message : 'Could not disconnect');
                      } finally {
                        setBusyItem(null);
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, border: `1px solid ${theme.colors.border}` }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {status?.plaid.configured && (
          <p className="mt-4 text-sm" style={{ color: theme.colors.textMuted }}>
            A payment between two connected accounts can show up on both sides. Delete one of them if that double counts.
            {status.plaid.webhookConfigured ? ' Webhook sync is on.' : ' Sync is manual until PLAID_WEBHOOK_URL is set.'}
          </p>
        )}
      </section>
    </div>
  );
}

function StatusPill({ ready, label }: { ready: boolean; label: string }) {
  const { theme } = useTheme();
  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: ready ? `${theme.colors.success}22` : theme.colors.background,
        color: ready ? theme.colors.success : theme.colors.textSecondary,
        border: `1px solid ${ready ? theme.colors.success : theme.colors.border}`,
      }}
    >
      {label}
    </span>
  );
}

function ConfigNote({ reason, lines }: { reason?: string; lines: string[] }) {
  const { theme } = useTheme();
  return (
    <div className="rounded-lg p-4 text-sm" style={{ backgroundColor: theme.colors.background }}>
      {reason && <p style={{ color: theme.colors.textSecondary }}>{reason}</p>}
      <pre className="mt-2 overflow-x-auto text-xs" style={{ color: theme.colors.textPrimary }}>{lines.join('\n')}</pre>
    </div>
  );
}

function ReviewRowEditor({
  row,
  categories,
  onChange,
}: {
  row: ReviewRow;
  categories: Category[];
  onChange: (patch: Partial<ReviewRow>) => void;
}) {
  const { theme } = useTheme();
  const choices = categories.filter((category) => category.isActive && (category.type === row.type || category.type === 'both'));
  const inputStyle = {
    backgroundColor: theme.colors.background,
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
  };

  return (
    <div className="rounded-lg p-3" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
      <label className="flex items-center gap-2 text-sm mb-2" style={{ color: theme.colors.textSecondary }}>
        <input
          type="checkbox"
          checked={row.selected}
          onChange={(event) => onChange({ selected: event.target.checked })}
        />
        {row.duplicate ? 'Already in the ledger' : 'Import this row'}
      </label>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <input className="rounded px-2 py-1 md:col-span-2" style={inputStyle} value={row.description} onChange={(event) => onChange({ description: event.target.value })} />
        <input className="rounded px-2 py-1" type="date" style={inputStyle} value={row.date} onChange={(event) => onChange({ date: event.target.value })} />
        <input className="rounded px-2 py-1" type="number" min="0" step="0.01" style={inputStyle} value={row.amount} onChange={(event) => onChange({ amount: event.target.value })} />
        <select
          className="rounded px-2 py-1"
          style={inputStyle}
          value={row.type}
          onChange={(event) => onChange({ type: event.target.value as ReviewRow['type'], category: '' })}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>
      <select
        className="rounded px-2 py-1 mt-2 w-full"
        style={inputStyle}
        value={row.category}
        onChange={(event) => onChange({ category: event.target.value })}
      >
        <option value="">No category</option>
        {choices.map((category) => (
          <option key={category.id} value={category.id}>{category.name}</option>
        ))}
      </select>
    </div>
  );
}

export function PlaidConnect({
  onConnected,
  onError,
  receivedRedirectUri,
}: {
  onConnected: (summary: { added: number; updated: number; removed: number; productNotReady: boolean }) => Promise<void>;
  onError: (message: string) => void;
  receivedRedirectUri?: string;
}) {
  const { theme } = useTheme();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const opened = useRef(false);

  useEffect(() => {
    if (!receivedRedirectUri) return;
    const stored = sessionStorage.getItem('plaid_link_token');
    if (stored) {
      setLinkToken(stored);
      setOpening(true);
      return;
    }
    onError('The Plaid session expired. Connect the bank again from Import.');
  }, [receivedRedirectUri, onError]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    receivedRedirectUri,
    onSuccess: async (publicToken, metadata) => {
      setOpening(true);
      try {
        const response = await fetch('/api/integrations/plaid/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicToken,
            institutionName: metadata.institution?.name ?? null,
          }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not connect that institution');
        await onConnected(body);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Could not connect that institution');
      } finally {
        setOpening(false);
        setLinkToken(null);
        opened.current = false;
        sessionStorage.removeItem('plaid_link_token');
      }
    },
    onExit: (error) => {
      opened.current = false;
      setLinkToken(null);
      if (error) onError(error.display_message || error.error_message || 'Plaid Link closed');
    },
  });

  useEffect(() => {
    if (linkToken && ready && !opened.current) {
      opened.current = true;
      open();
    }
  }, [linkToken, ready, open]);

  if (receivedRedirectUri) {
    return (
      <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
        {opening ? 'Opening Plaid...' : 'Returning from your bank.'}
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={opening}
      onClick={async () => {
        setOpening(true);
        opened.current = false;
        try {
          const response = await fetch('/api/integrations/plaid/link-token', { method: 'POST' });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error || 'Could not start Plaid Link');
          sessionStorage.setItem('plaid_link_token', body.linkToken);
          setLinkToken(body.linkToken);
        } catch (error) {
          onError(error instanceof Error ? error.message : 'Could not start Plaid Link');
          setOpening(false);
        }
      }}
      className="px-4 py-2 rounded-lg font-medium"
      style={{ backgroundColor: theme.colors.accent, color: '#ffffff' }}
    >
      {opening ? 'Connecting...' : 'Connect a bank'}
    </button>
  );
}
