import { useDeferredValue, useState, type FormEvent } from "react";
import { Pencil, UserPlus, X } from "lucide-react";
import { useClients } from "../../hooks/useLoans";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../types/database";

export function Clients() {
  const { clients, loading, error, reload } = useClients();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const [showAdd, setShowAdd] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editing, setEditing] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const filtered = clients.filter((c) => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.full_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q)
    );
  });

  const handleCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    setSaving(true);

    const { data, error: fnError } = await supabase.functions.invoke("create-client", {
      body: {
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
      },
    });

    if (fnError || data?.error) {
      setFormError(data?.error ?? fnError?.message ?? "Failed to create client account");
      setSaving(false);
      return;
    }

    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setShowAdd(false);
    setNotice("Client account created. Share their email and temporary password securely.");
    setSaving(false);
    await reload();
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setFormError(null);
    setSaving(true);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: editName.trim(),
        phone: editPhone.trim() || null,
      })
      .eq("id", editing.id);

    if (updateError) {
      setFormError(updateError.message);
      setSaving(false);
      return;
    }

    setEditing(null);
    setSaving(false);
    await reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950">Clients</h1>
          <p className="text-sm text-slate-600">Manage borrower accounts created by you.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAdd((prev) => !prev);
            setFormError(null);
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {showAdd ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          <span>{showAdd ? "Cancel" : "Add client"}</span>
        </button>
      </div>

      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {(error || formError) && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {formError ?? error}
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleCreateClient}
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2"
        >
          <div>
            <label htmlFor="client-name" className="block text-sm font-medium text-slate-800">
              Full name
            </label>
            <input
              id="client-name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="client-email" className="block text-sm font-medium text-slate-800">
              Email
            </label>
            <input
              id="client-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="client-phone" className="block text-sm font-medium text-slate-800">
              Phone (optional)
            </label>
            <input
              id="client-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09XX XXX XXXX"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="client-password" className="block text-sm font-medium text-slate-800">
              Temporary password (min 8 chars)
            </label>
            <input
              id="client-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create client account"}
            </button>
          </div>
        </form>
      )}

      {editing && (
        <form
          onSubmit={handleSaveEdit}
          className="grid gap-4 rounded-lg border border-blue-200 bg-blue-50/40 p-5 sm:grid-cols-2"
        >
          <div className="flex items-center justify-between sm:col-span-2">
            <h2 className="text-sm font-semibold text-slate-950">Edit {editing.email}</h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="cursor-pointer text-xs text-slate-600 hover:underline"
            >
              Close
            </button>
          </div>
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-slate-800">
              Full name
            </label>
            <input
              id="edit-name"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="edit-phone" className="block text-sm font-medium text-slate-800">
              Phone
            </label>
            <input
              id="edit-phone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      )}

      <div>
        <label htmlFor="client-search" className="sr-only">
          Search clients
        </label>
        <input
          id="client-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="w-full max-w-sm rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading clients...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No clients match your search.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-900">{client.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{client.email}</td>
                  <td className="px-4 py-3 text-slate-600 tabular-nums">{client.phone || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(client);
                        setEditName(client.full_name);
                        setEditPhone(client.phone ?? "");
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Edit</span>
                    </button>
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
