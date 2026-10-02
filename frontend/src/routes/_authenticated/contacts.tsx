import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Shell, Panel } from "@/components/deadhand/Shell";
import { addContact, listContacts, removeContact } from "@/lib/deadhand.functions";

export const Route = createFileRoute("/_authenticated/contacts")({
  head: () => ({ meta: [{ title: "Связь · Dead Hand Contacts" }, { name: "description", content: "Pre-authorized emergency contacts." }] }),
  component: Contacts,
});

function Contacts() {
  const qc = useQueryClient();
  const list = useServerFn(listContacts);
  const add = useServerFn(addContact);
  const rm = useServerFn(removeContact);
  const { data } = useQuery({ queryKey: ["contacts"], queryFn: () => list() });
  const [f, setF] = useState({ alias: "", name: "", email: "", phone: "", priority: 1 });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await add({ data: f });
      setF({ alias: "", name: "", email: "", phone: "", priority: f.priority + 1 > 9 ? 9 : f.priority + 1 });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact authorized");
    } catch {
      toast.error("Check the fields");
    }
  }
  const inp = "w-full border border-input bg-panel px-3 py-2 text-sm";

  return (
    <Shell>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Новый контакт · Authorize contact" code="AES-256-GCM">
          <form onSubmit={submit} className="space-y-2">
            <input required placeholder="Alias (e.g. Brother)" value={f.alias} onChange={(e) => setF({ ...f, alias: e.target.value })} className={inp} />
            <input required placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} />
            <input required type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inp} />
            <input placeholder="Phone (optional)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inp} />
            <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">Priority (1 = first)
              <input type="number" min={1} max={9} value={f.priority} onChange={(e) => setF({ ...f, priority: Number(e.target.value) })} className={inp} />
            </label>
            <button className="w-full bg-primary py-2.5 font-display text-sm uppercase tracking-widest text-primary-foreground">Authorize</button>
          </form>
        </Panel>
        <Panel title="Цепь оповещения · Cascade order">
          <ul className="space-y-2 text-xs">
            {data?.map((c) => (
              <li key={c.id} className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <p className={c.authorized ? "text-primary" : "text-muted-foreground line-through"}>P{c.priority} · {c.alias}</p>
                  <p className="text-[10px] text-muted-foreground">{c.detail ? `${c.detail.name} · ${c.detail.email}` : "sealed"}</p>
                </div>
                {c.authorized && <button onClick={async () => { await rm({ data: { id: c.id } }); qc.invalidateQueries({ queryKey: ["contacts"] }); }} className="text-[10px] uppercase text-destructive">Remove</button>}
              </li>
            ))}
            {!data?.length && <li className="text-muted-foreground">No contacts authorized.</li>}
          </ul>
        </Panel>
      </div>
    </Shell>
  );
}
