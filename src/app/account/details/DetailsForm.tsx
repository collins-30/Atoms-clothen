"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAddress, saveAddress, saveDetails } from "@/server/profile";

export type ProfileData = { name: string; email: string; phone: string; dateOfBirth: string; emailMarketing: boolean };
export type AddressData = {
  id: string;
  label: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
};

const EMPTY_ADDR: AddressData = {
  id: "",
  label: "",
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  postalCode: "",
  country: "",
  phone: "",
  isDefault: false,
};

const inputClass = "bg-transparent border-stone-300 rounded-none h-10 text-sm";
const labelClass = "text-[10px] tracking-[0.15em] uppercase text-stone-500";

function AddressField({
  label,
  name,
  draft,
  setDraft,
}: {
  label: string;
  name: keyof AddressData;
  draft: AddressData;
  setDraft: (a: AddressData) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`addr-${name}`} className={labelClass}>
        {label}
      </Label>
      <Input
        id={`addr-${name}`}
        value={String(draft[name] ?? "")}
        onChange={(e) => setDraft({ ...draft, [name]: e.target.value })}
        className={inputClass}
      />
    </div>
  );
}

export default function DetailsForm({ profile, addresses }: { profile: ProfileData; addresses: AddressData[] }) {
  const router = useRouter();

  const [form, setForm] = useState({
    phone: profile.phone,
    dateOfBirth: profile.dateOfBirth,
    emailMarketing: profile.emailMarketing,
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [detailsError, setDetailsError] = useState("");

  const [draft, setDraft] = useState<AddressData | null>(null);
  const [addrError, setAddrError] = useState("");
  const [savingAddr, setSavingAddr] = useState(false);

  const flash = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 3500);
  };

  const submitDetails = async () => {
    setSaving(true);
    setDetailsError("");
    try {
      const res = await saveDetails(form);
      if (res.ok) {
        flash("Details saved");
        router.refresh();
      } else {
        setDetailsError(res.error);
      }
    } catch {
      setDetailsError("Could not save your details. Please try again.");
    }
    setSaving(false);
  };

  const openAdd = () => {
    setAddrError("");
    setDraft({ ...EMPTY_ADDR, fullName: profile.name, phone: form.phone });
  };
  const openEdit = (a: AddressData) => {
    setAddrError("");
    setDraft({ ...a });
  };

  const submitAddress = async () => {
    if (!draft) return;
    if (!draft.label.trim() || !draft.line1.trim() || !draft.city.trim() || !draft.country.trim()) {
      setAddrError("Please fill in the label, street address, city and country.");
      return;
    }
    setSavingAddr(true);
    setAddrError("");
    try {
      const res = await saveAddress({ ...draft, id: draft.id || undefined });
      if (res.ok) {
        flash(draft.id ? "Address updated" : "Address added");
        setDraft(null);
        router.refresh();
      } else {
        setAddrError(res.error);
      }
    } catch {
      setAddrError("Could not save the address. Please try again.");
    }
    setSavingAddr(false);
  };

  const removeAddress = async (id: string) => {
    try {
      const res = await deleteAddress(id);
      if (res.ok) {
        flash("Address removed");
        router.refresh();
      } else {
        flash(res.error);
      }
    } catch {
      flash("Could not remove the address.");
    }
  };

  return (
    <div className="max-w-2xl">
      {notice && (
        <p role="status" className="mb-6 p-3 bg-secondary text-sm text-foreground">
          {notice}
        </p>
      )}

      <h2 className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a] mb-6">Contact details</h2>
      <div className="border border-stone-200 p-6 md:p-8">
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <p className={labelClass}>Full name</p>
            <p className="text-sm text-[#1a1a1a] py-2">{profile.name || "—"}</p>
          </div>
          <div className="space-y-1.5">
            <p className={labelClass}>Email</p>
            <p className="text-sm text-[#1a1a1a] py-2">{profile.email}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className={labelClass}>Phone</Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob" className={labelClass}>Date of birth</Label>
            <Input
              id="dob"
              type="date"
              autoComplete="bday"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        <p className="text-xs text-stone-400 mt-4">To change your name or email, contact support.</p>
        <div className="flex items-center gap-2.5 mt-6">
          <Checkbox
            id="marketing"
            checked={form.emailMarketing}
            onCheckedChange={(v) => setForm({ ...form, emailMarketing: v === true })}
          />
          <Label htmlFor="marketing" className="text-sm text-stone-600 font-normal cursor-pointer">
            Email me about new arrivals, private sales and editorial stories
          </Label>
        </div>
        {detailsError && <p role="alert" className="text-xs text-rose-700 mt-4">{detailsError}</p>}
        <Button
          onClick={submitDetails}
          disabled={saving}
          className="mt-8 bg-[#1a1a1a] text-[#F9F9F7] hover:bg-[#333] rounded-none px-8 text-xs tracking-[0.15em] uppercase"
        >
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save changes
        </Button>
      </div>

      <div className="mt-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a]">Address book</h2>
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-[#1a1a1a] hover:opacity-60">
            <Plus className="w-3.5 h-3.5" /> Add address
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="border border-stone-200 py-12 text-center">
            <p className="text-sm text-stone-500">No saved addresses yet. Add one for faster checkout.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {addresses.map((a) => (
              <div key={a.id} className="border border-stone-200 p-5 relative">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500">{a.label}</p>
                  {a.isDefault && (
                    <span className="text-[9px] tracking-[0.15em] uppercase bg-stone-100 text-stone-600 px-2 py-0.5">Default</span>
                  )}
                </div>
                <div className="text-sm text-stone-600 leading-relaxed">
                  <p className="text-[#1a1a1a]">{a.fullName}</p>
                  <p>
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}
                  </p>
                  <p>{[a.city, a.postalCode].filter(Boolean).join(", ")}</p>
                  <p>{a.country}</p>
                  {a.phone && <p>{a.phone}</p>}
                </div>
                <div className="flex gap-4 mt-4">
                  <button onClick={() => openEdit(a)} className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-[#1a1a1a]">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => removeAddress(a.id)} className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-rose-700">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={draft !== null}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-none bg-[#F9F9F7]">
          <DialogHeader>
            <DialogTitle className="text-sm tracking-[0.2em] uppercase text-[#1a1a1a]" style={{ fontFamily: "var(--font-heading)" }}>
              {draft?.id ? "Edit address" : "Add address"}
            </DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <AddressField label="Label *" name="label" draft={draft} setDraft={setDraft} />
                <AddressField label="Full name" name="fullName" draft={draft} setDraft={setDraft} />
              </div>
              <AddressField label="Street address *" name="line1" draft={draft} setDraft={setDraft} />
              <AddressField label="Apartment, suite (optional)" name="line2" draft={draft} setDraft={setDraft} />
              <div className="grid sm:grid-cols-2 gap-4">
                <AddressField label="City *" name="city" draft={draft} setDraft={setDraft} />
                <AddressField label="Postal code" name="postalCode" draft={draft} setDraft={setDraft} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <AddressField label="Country *" name="country" draft={draft} setDraft={setDraft} />
                <AddressField label="Phone" name="phone" draft={draft} setDraft={setDraft} />
              </div>
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="addr-default"
                  checked={draft.isDefault}
                  onCheckedChange={(v) => setDraft({ ...draft, isDefault: v === true })}
                />
                <Label htmlFor="addr-default" className="text-sm text-stone-600 font-normal cursor-pointer">
                  Set as default address
                </Label>
              </div>
              {addrError && <p role="alert" className="text-xs text-rose-700">{addrError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setDraft(null)} className="rounded-none text-xs tracking-[0.15em] uppercase">
                  Cancel
                </Button>
                <Button
                  onClick={submitAddress}
                  disabled={savingAddr}
                  className="bg-[#1a1a1a] text-[#F9F9F7] hover:bg-[#333] rounded-none px-8 text-xs tracking-[0.15em] uppercase"
                >
                  {savingAddr && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save address
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
