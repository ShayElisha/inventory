"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { KeyRound, Link2, Store, Trash2 } from "lucide-react";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};
type Webhook = {
  id: string;
  url: string;
  active: boolean;
  createdAt: string;
};
type Integration = {
  id: string;
  provider: string;
  active: boolean;
  lastSyncAt: string | null;
};

export function IntegrationsPanel() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [keyName, setKeyName] = useState("Production");
  const [rawKey, setRawKey] = useState("");
  const [hookUrl, setHookUrl] = useState("");
  const [shop, setShop] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  async function load() {
    const res = await fetch("/api/integrations");
    if (!res.ok) return;
    const data = await res.json();
    setApiKeys(data.apiKeys || []);
    setWebhooks(data.webhooks || []);
    setIntegrations(data.integrations || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createKey() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "api-key", name: keyName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setRawKey(data.rawKey || "");
      setToast("מפתח נוצר — העתיקו עכשיו, לא יוצג שוב");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function createWebhook() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "webhook", url: hookUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setHookUrl("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function saveShopify() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "shopify",
          shop,
          accessToken: token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setToast("Shopify נשמר");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function syncShopify() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/integrations/shopify/sync", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setToast(`סנכרון: ${data.created} חדשים, ${data.updated} עודכנו`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function remove(type: string, id: string) {
    setLoading(true);
    await fetch(
      `/api/integrations?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    await load();
    setLoading(false);
  }

  const shopify = integrations.find((i) => i.provider === "SHOPIFY");

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {toast && (
        <p className="rounded-lg border border-[var(--ok)]/30 px-3 py-2 text-sm text-[var(--ok)]">
          {toast}
        </p>
      )}

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <KeyRound className="h-5 w-5" />
          API Keys
        </h2>
        <p className="text-sm text-[var(--muted)]">
          השתמשו ב־Authorization: Bearer sfira_… מול{" "}
          <code className="text-xs">/api/v1/stock</code>
        </p>
        {rawKey && (
          <div className="rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-3 font-mono text-xs break-all">
            {rawKey}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Input
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="שם מפתח"
          />
          <Button disabled={loading} onClick={() => createKey()}>
            צור מפתח
          </Button>
        </div>
        <ul className="space-y-2">
          {apiKeys.map((k) => (
            <li
              key={k.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium">{k.name}</span>{" "}
                <Badge>{k.keyPrefix}…</Badge>
                <p className="text-xs text-[var(--muted)]">
                  {formatDateTime(k.createdAt)}
                  {k.lastUsedAt
                    ? ` · שימוש אחרון ${formatDateTime(k.lastUsedAt)}`
                    : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove("api-key", k.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Link2 className="h-5 w-5" />
          Webhooks יוצאים
        </h2>
        <div className="flex flex-wrap gap-2">
          <Input
            value={hookUrl}
            onChange={(e) => setHookUrl(e.target.value)}
            placeholder="https://example.com/hooks/sfira"
            className="min-w-[240px] flex-1"
          />
          <Button disabled={loading || !hookUrl} onClick={() => createWebhook()}>
            הוסף
          </Button>
        </div>
        <ul className="space-y-2">
          {webhooks.map((w) => (
            <li
              key={w.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            >
              <span className="break-all font-mono text-xs">{w.url}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove("webhook", w.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Store className="h-5 w-5" />
          Shopify
        </h2>
        {shopify && (
          <p className="text-sm text-[var(--muted)]">
            מחובר
            {shopify.lastSyncAt
              ? ` · סנכרון אחרון ${formatDateTime(shopify.lastSyncAt)}`
              : ""}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>חנות (myshop.myshopify.com)</Label>
            <Input value={shop} onChange={(e) => setShop(e.target.value)} />
          </div>
          <div>
            <Label>Admin API access token</Label>
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={loading} onClick={() => saveShopify()}>
            שמור חיבור
          </Button>
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => syncShopify()}
          >
            סנכרן מוצרים
          </Button>
        </div>
      </Card>
    </div>
  );
}
