import { useState, useEffect, useRef } from "react";

const ADMIN_PASSWORD = "coach123";
const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward", "Any Position"];
const PAYMENT_METHODS = ["Bank Transfer"];
const BANK_DETAILS = { bank: "FNB", accountName: "Hazelbury FC", accountNumber: "62012345678", branchCode: "250655", reference: "Your Full Name" };

function isClosed() {
  const now = new Date();
  const day = now.getDay(); // 6 = Saturday
  const hour = now.getHours();
  const min = now.getMinutes();
  return day === 6 && (hour > 10 || (hour === 10 && min >= 0));
}

function getNextSaturday() {
  const now = new Date();
  const day = now.getDay();
  const diff = (6 - day + 7) % 7 || 7;
  const sat = new Date(now);
  sat.setDate(now.getDate() + diff);
  sat.setHours(10, 0, 0, 0);
  return sat;
}

function Countdown() {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const update = () => {
      const target = getNextSaturday();
      const now = new Date();
      let diff = target - now;
      if (diff <= 0) { setTimeLeft("CLOSED"); return; }
      const d = Math.floor(diff / 86400000); diff %= 86400000;
      const h = Math.floor(diff / 3600000); diff %= 3600000;
      const m = Math.floor(diff / 60000); diff %= 60000;
      const s = Math.floor(diff / 1000);
      setTimeLeft(`${d}d ${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);
  return <span>{timeLeft}</span>;
}

// ─── REGISTRATION FORM ──────────────────────────────────────────────────────
function RegistrationForm({ onRegistered, toast }) {
  const [players, setPlayers] = useState([{ id:1, name:"", phone:"", position:"" }]);
  const [paymentMethod] = useState("Bank Transfer");
  const [amountPaid, setAmountPaid] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();
  const closed = isClosed();

  const addPlayer = () => setPlayers(p => [...p, { id: Date.now(), name:"", phone:"", position:"" }]);
  const removePlayer = (id) => { if (players.length === 1) return; setPlayers(p => p.filter(x => x.id !== id)); };
  const updatePlayer = (id, field, value) => {
    setPlayers(p => p.map(x => x.id === id ? {...x, [field]: value} : x));
    setErrors(e => ({...e, [`${id}_${field}`]: ""}));
  };

  const handleFile = (file) => {
    if (!file) return;
    setProofFile(file);
    setErrors(e => ({...e, proofFile:""}));
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    players.forEach(p => {
      if (!p.name.trim()) e[`${p.id}_name`] = "Required";
      if (!p.phone.trim()) e[`${p.id}_phone`] = "Required";
      if (!p.position) e[`${p.id}_position`] = "Required";
    });
    if (!amountPaid) e.amountPaid = "Enter amount paid";
    if (!proofFile) e.proofFile = "Upload proof of payment";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);

    const toBase64 = f => new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(f);
    });

    const proofBase64 = await toBase64(proofFile);

    try {
      const existing = await window.storage.get("registrations");
      const list = existing ? JSON.parse(existing.value) : [];
      players.forEach(p => {
        list.push({
          id: Date.now().toString() + Math.random(),
          name: p.name,
          phone: p.phone,
          position: p.position,
          paymentMethod: "Bank Transfer",
          amountPaid,
          proofImage: proofBase64,
          proofFileName: proofFile.name,
          registeredAt: new Date().toLocaleString(),
          paymentVerified: false,
        });
      });
      await window.storage.set("registrations", JSON.stringify(list));
    } catch(err) { console.error(err); }

    const names = players.map(p => p.name).join(", ");
    setPlayers([{ id:1, name:"", phone:"", position:"" }]);
    setAmountPaid("");
    setProofFile(null);
    setPreview(null);
    setErrors({});
    setSubmitting(false);
    onRegistered(names, players.length);
  };

  if (closed) {
    return (
      <div style={s.closedBox}>
        <div style={s.closedIcon}>🔒</div>
        <h2 style={s.closedTitle}>Registration Closed</h2>
        <p style={s.closedMsg}>Registration closes at <strong>10:00 AM every Saturday</strong>. Check back next week!</p>
      </div>
    );
  }

  return (
    <div style={s.formCard}>
      {toast && (
        <div style={s.toastBanner}>
          ✅ <strong>{toast}</strong> registered successfully! Add more players below.
        </div>
      )}
      <div style={s.cutoffBanner}>
        ⏱ Registration closes Saturday at 10:00 AM &nbsp;·&nbsp; <strong><Countdown /></strong>
      </div>

      {/* Player List */}
      <div style={s.sectionLabel}>👤 Players ({players.length})</div>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
        {players.map((p, idx) => (
          <div key={p.id} style={s.playerRow}>
            <div style={s.playerRowNum}>#{idx+1}</div>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1}}>
                  <input
                    style={{...s.input, ...(errors[`${p.id}_name`]?s.inputErr:{})}}
                    placeholder="Full Name"
                    value={p.name}
                    onChange={e=>updatePlayer(p.id,"name",e.target.value)}
                  />
                  {errors[`${p.id}_name`] && <span style={s.error}>{errors[`${p.id}_name`]}</span>}
                </div>
                <div style={{flex:1}}>
                  <input
                    style={{...s.input, ...(errors[`${p.id}_phone`]?s.inputErr:{})}}
                    placeholder="Phone Number"
                    value={p.phone}
                    onChange={e=>updatePlayer(p.id,"phone",e.target.value)}
                  />
                  {errors[`${p.id}_phone`] && <span style={s.error}>{errors[`${p.id}_phone`]}</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {POSITIONS.map(pos => (
                  <button key={pos} style={{...s.pill,...(p.position===pos?s.pillActive:{})}} onClick={()=>updatePlayer(p.id,"position",pos)}>{pos}</button>
                ))}
                {errors[`${p.id}_position`] && <span style={{...s.error,width:"100%"}}>{errors[`${p.id}_position`]}</span>}
              </div>
            </div>
            {players.length > 1 && (
              <button style={s.removeBtn} onClick={()=>removePlayer(p.id)}>✕</button>
            )}
          </div>
        ))}
      </div>

      <button style={s.addBtn} onClick={addPlayer}>
        + Add Another Player
      </button>

      <div style={s.divider} />

      {/* Payment */}
      <div style={s.sectionLabel}>💳 Payment Details</div>
      <div style={s.bankCard}>
        <div style={s.bankTitle}>🏦 Transfer payment to Hazelbury FC</div>
        <div style={s.bankGrid}>
          <div style={s.bankRow}><span style={s.bankKey}>Account Name</span><span style={s.bankVal}>EE Boison</span></div>
          <div style={s.bankRow}><span style={s.bankKey}>Sort Code</span><span style={s.bankVal}>09-01-26</span></div>
          <div style={s.bankRow}><span style={s.bankKey}>Account Number</span><span style={s.bankVal}>88056037</span></div>
          <div style={s.bankRow}><span style={s.bankKey}>Reference</span><span style={s.bankVal}>Your Full Name</span></div>
        </div>
      </div>

      <Field label="Total Amount Paid (R) *" error={errors.amountPaid}>
        <input type="number" style={{...s.input,...(errors.amountPaid?s.inputErr:{})}} value={amountPaid} onChange={e=>{setAmountPaid(e.target.value);setErrors(er=>({...er,amountPaid:""}));}} placeholder="e.g. 150" />
      </Field>

      <Field label="Proof of Payment *" error={errors.proofFile}>
        <div
          style={{...s.dropzone,...(dragging?s.dropDrag:{}),...(errors.proofFile?s.dropErr:{})}}
          onClick={()=>fileRef.current.click()}
          onDragOver={e=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0]);}}
        >
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])} />
          {preview ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
              <img src={preview} alt="proof" style={{maxHeight:90,maxWidth:"100%",borderRadius:8,objectFit:"contain"}} />
              <span style={{color:"#a3e6b4",fontSize:12}}>{proofFile.name} · Click to change</span>
            </div>
          ) : (
            <div>
              <div style={{fontSize:28,marginBottom:6}}>📎</div>
              <div style={{color:"rgba(255,255,255,0.6)",fontSize:14}}>Drag & drop or <span style={{color:"#4ade80",fontWeight:700}}>browse</span></div>
              <div style={{color:"rgba(255,255,255,0.3)",fontSize:12,marginTop:4}}>JPG, PNG or PDF</div>
            </div>
          )}
        </div>
      </Field>

      <button style={{...s.submitBtn,opacity:submitting?0.7:1}} onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Registering..." : `⚽  Register ${players.length} Player${players.length>1?"s":""}`}
      </button>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{display:"flex",flexDirection:"column",marginBottom:16,flex:1}}>
      <label style={s.label}>{label}</label>
      {children}
      {error && <span style={s.error}>{error}</span>}
    </div>
  );
}

// ─── SUCCESS ────────────────────────────────────────────────────────────────
function Success({ name, onBack }) {
  return (
    <div style={s.successCard}>
      <div style={{fontSize:60,marginBottom:12}}>⚽</div>
      <h2 style={{color:"#4ade80",fontSize:28,fontWeight:900,margin:"0 0 10px"}}>You're on the team!</h2>
      <p style={{color:"rgba(255,255,255,0.65)",fontSize:15,lineHeight:1.7,margin:"0 0 28px"}}>
        <strong style={{color:"#fff"}}>{name}</strong>, your registration is confirmed.<br />See you Saturday! 🏟️
      </p>
      <button style={s.outlineBtn} onClick={onBack}>Register Another Player</button>
    </div>
  );
}

// ─── ADMIN LOGIN ─────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const attempt = () => {
    if (pw === ADMIN_PASSWORD) onLogin();
    else { setError("Incorrect password. Try again."); setPw(""); }
  };
  return (
    <div style={s.formCard}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:36,marginBottom:8}}>🔐</div>
        <h3 style={{color:"#fff",margin:0,fontWeight:800,fontSize:20}}>Admin Access</h3>
        <p style={{color:"rgba(255,255,255,0.4)",fontSize:13,margin:"6px 0 0"}}>Enter your password to continue</p>
      </div>
      <input
        type="password"
        placeholder="Password"
        value={pw}
        onChange={e=>{setPw(e.target.value);setError("");}}
        onKeyDown={e=>e.key==="Enter"&&attempt()}
        style={{...s.input,marginBottom:8,textAlign:"center",fontSize:18,letterSpacing:4}}
      />
      {error && <p style={{...s.error,textAlign:"center",marginBottom:8}}>{error}</p>}
      <button style={s.submitBtn} onClick={attempt}>Login</button>
    </div>
  );
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
function AdminDashboard({ onLogout }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      const data = await window.storage.get("registrations");
      setPlayers(data ? JSON.parse(data.value) : []);
    } catch { setPlayers([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleVerify = async (id) => {
    const updated = players.map(p => p.id === id ? {...p, paymentVerified: !p.paymentVerified} : p);
    setPlayers(updated);
    await window.storage.set("registrations", JSON.stringify(updated));
  };

  const deletePlayer = async (id) => {
    const updated = players.filter(p => p.id !== id);
    setPlayers(updated);
    setSelected(null);
    await window.storage.set("registrations", JSON.stringify(updated));
  };

  const exportCSV = () => {
    const headers = ["Name","Phone","Position","Payment Method","Amount Paid","Registered At","Payment Verified"];
    const rows = players.map(p => [p.name,p.phone,p.position,p.paymentMethod,`R${p.amountPaid}`,p.registeredAt,p.paymentVerified?"Yes":"No"]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="registrations.csv"; a.click();
  };

  const verified = players.filter(p => p.paymentVerified).length;

  if (loading) return <div style={{color:"rgba(255,255,255,0.4)",textAlign:"center",padding:60}}>Loading...</div>;

  return (
    <div style={{width:"100%",maxWidth:780}}>
      {/* Stats row */}
      <div style={s.statsRow}>
        <div style={s.statBox}><span style={s.statNum}>{players.length}</span><span style={s.statLbl}>Registered</span></div>
        <div style={s.statBox}><span style={{...s.statNum,color:"#4ade80"}}>{verified}</span><span style={s.statLbl}>Verified</span></div>
        <div style={s.statBox}><span style={{...s.statNum,color:"#f87171"}}>{players.length-verified}</span><span style={s.statLbl}>Pending</span></div>
      </div>

      {/* Actions */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h3 style={{color:"#fff",margin:0,fontWeight:800}}>Player Registrations</h3>
        <div style={{display:"flex",gap:8}}>
          {players.length > 0 && <button style={s.outlineBtn} onClick={exportCSV}>Export CSV</button>}
          <button style={{...s.outlineBtn,borderColor:"rgba(255,255,255,0.1)"}} onClick={onLogout}>Logout</button>
        </div>
      </div>

      {players.length === 0 ? (
        <div style={{...s.formCard,textAlign:"center",color:"rgba(255,255,255,0.4)",padding:"40px 20px"}}>
          No players registered yet.
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {players.map((p, idx) => (
            <div key={p.id} style={{...s.playerCard, ...(p.paymentVerified?s.playerVerified:{})}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <div>
                  <span style={{color:"rgba(255,255,255,0.3)",fontWeight:700,fontSize:13,marginRight:8}}>#{idx+1}</span><span style={{color:"#fff",fontWeight:800,fontSize:16}}>{p.name}</span>
                  <span style={s.posTag}>{p.position}</span>
                  {p.paymentVerified && <span style={s.verifiedTag}>✓ Verified</span>}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button style={s.iconBtn} onClick={()=>setSelected(selected?.id===p.id?null:p)}>🧾 Proof</button>
                  <button style={{...s.iconBtn,background:p.paymentVerified?"rgba(239,68,68,0.15)":"rgba(74,222,128,0.15)",color:p.paymentVerified?"#f87171":"#4ade80"}} onClick={()=>toggleVerify(p.id)}>
                    {p.paymentVerified ? "✗ Unverify" : "✓ Verify"}
                  </button>
                  <button style={{...s.iconBtn,background:"rgba(239,68,68,0.1)",color:"#f87171"}} onClick={()=>deletePlayer(p.id)}>🗑</button>
                </div>
              </div>
              <div style={s.playerMeta}>
                <span>📞 {p.phone}</span>
                <span>💳 {p.paymentMethod} · R{p.amountPaid}</span>
                <span>🕐 {p.registeredAt}</span>
              </div>
              {selected?.id === p.id && (
                <div style={s.proofBox}>
                  <p style={{color:"rgba(255,255,255,0.5)",fontSize:12,margin:"0 0 8px"}}>Proof: {p.proofFileName}</p>
                  <img src={p.proofImage} alt="proof" style={{maxWidth:"100%",maxHeight:200,borderRadius:8,objectFit:"contain"}} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("register");
  const [registeredName, setRegisteredName] = useState("");
  const [toast, setToast] = useState("");

  const handleRegistered = (names, count) => {
    setToast(`${count} player${count>1?"s":""}: ${names}`);
    setTimeout(() => setToast(""), 8000);
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;900&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        input, select, button { font-family: 'DM Sans', sans-serif; }
        input:focus, select:focus { outline: none; border-color: #4ade80 !important; }
        button:hover { filter: brightness(1.1); }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #4ade8040; border-radius: 4px; }
      `}</style>

      {/* Pitch grid background */}
      <div style={s.pitchBg} />

      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>⚽ HAZELBURY FC</div>
        <h1 style={s.mainTitle}>Game Day Registration</h1>
        <p style={s.mainSub}>Hazelbury FC · Secure your spot on the pitch before Saturday 10:00 AM</p>
        <div style={s.navTabs}>
          <button style={{...s.tab,...(["register","success"].includes(page)?s.tabActive:{})}} onClick={()=>setPage("register")}>Player Sign-Up</button>
          <button style={{...s.tab,...(["adminLogin","admin"].includes(page)?s.tabActive:{})}} onClick={()=>setPage(page==="admin"?"admin":"adminLogin")}>Admin</button>
        </div>
      </div>

      {/* Content */}
      <div style={s.content}>
        {page === "register" && <RegistrationForm onRegistered={handleRegistered} toast={toast} />}

        {page === "adminLogin" && <AdminLogin onLogin={()=>setPage("admin")} />}
        {page === "admin" && <AdminDashboard onLogout={()=>setPage("adminLogin")} />}
      </div>

      <p style={{color:"rgba(255,255,255,0.15)",fontSize:11,textAlign:"center",marginTop:32,fontFamily:"'DM Sans',sans-serif"}}>
        Hazelbury FC · Registration closes 10:00 AM every Saturday
      </p>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = {
  page: { minHeight:"100vh", background:"#061a0e", display:"flex", flexDirection:"column", alignItems:"center", padding:"0 16px 48px", position:"relative", overflow:"hidden", fontFamily:"'DM Sans',sans-serif" },
  pitchBg: { position:"fixed", inset:0, backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 60px,rgba(255,255,255,0.015) 60px,rgba(255,255,255,0.015) 61px),repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(255,255,255,0.015) 60px,rgba(255,255,255,0.015) 61px)", pointerEvents:"none" },
  header: { width:"100%", maxWidth:780, textAlign:"center", padding:"40px 0 28px", position:"relative", zIndex:1 },
  logo: { display:"inline-block", background:"rgba(74,222,128,0.1)", border:"1px solid rgba(74,222,128,0.3)", color:"#4ade80", fontSize:11, fontWeight:700, letterSpacing:3, padding:"5px 14px", borderRadius:999, marginBottom:14, textTransform:"uppercase", fontFamily:"'DM Sans',sans-serif" },
  mainTitle: { color:"#fff", fontSize:42, fontWeight:900, margin:"0 0 8px", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1, textTransform:"uppercase" },
  mainSub: { color:"rgba(255,255,255,0.4)", fontSize:14, margin:"0 0 24px" },
  navTabs: { display:"flex", justifyContent:"center", gap:4, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:4, display:"inline-flex" },
  tab: { padding:"8px 22px", borderRadius:9, border:"none", background:"transparent", color:"rgba(255,255,255,0.45)", fontWeight:600, fontSize:13, cursor:"pointer", transition:"all 0.2s" },
  tabActive: { background:"rgba(74,222,128,0.15)", color:"#4ade80" },
  content: { width:"100%", maxWidth:780, display:"flex", justifyContent:"center", position:"relative", zIndex:1 },
  formCard: { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"32px 28px", width:"100%", backdropFilter:"blur(12px)" },
  cutoffBanner: { background:"rgba(234,179,8,0.1)", border:"1px solid rgba(234,179,8,0.25)", color:"#fde047", fontSize:13, borderRadius:10, padding:"10px 16px", marginBottom:24, textAlign:"center" },
  row: { display:"flex", gap:14 },
  label: { color:"rgba(255,255,255,0.55)", fontSize:12, fontWeight:600, marginBottom:7, letterSpacing:0.5, textTransform:"uppercase" },
  input: { background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, color:"#fff", fontSize:15, padding:"11px 14px", width:"100%", transition:"border 0.2s" },
  inputErr: { borderColor:"#f87171" },
  error: { color:"#f87171", fontSize:12, marginTop:5 },
  pills: { display:"flex", flexWrap:"wrap", gap:8 },
  pill: { padding:"8px 16px", borderRadius:999, border:"1px solid rgba(255,255,255,0.12)", background:"transparent", color:"rgba(255,255,255,0.5)", fontSize:13, cursor:"pointer", fontWeight:600, transition:"all 0.2s" },
  pillActive: { background:"rgba(74,222,128,0.15)", border:"1px solid #4ade80", color:"#4ade80" },
  divider: { borderTop:"1px solid rgba(255,255,255,0.07)", margin:"20px 0" },
  sectionLabel: { color:"#4ade80", fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", marginBottom:16 },
  dropzone: { border:"2px dashed rgba(255,255,255,0.15)", borderRadius:12, padding:"24px 16px", textAlign:"center", cursor:"pointer", transition:"all 0.2s", background:"rgba(255,255,255,0.02)" },
  dropDrag: { border:"2px dashed #4ade80", background:"rgba(74,222,128,0.05)" },
  dropErr: { borderColor:"#f87171" },
  submitBtn: { width:"100%", background:"linear-gradient(90deg,#16a34a,#4ade80)", color:"#fff", fontWeight:800, fontSize:16, border:"none", borderRadius:12, padding:"15px", cursor:"pointer", marginTop:8, letterSpacing:0.5, fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, textTransform:"uppercase", letterSpacing:1 },
  outlineBtn: { padding:"9px 18px", borderRadius:9, border:"1px solid rgba(74,222,128,0.4)", background:"transparent", color:"#4ade80", fontWeight:700, fontSize:13, cursor:"pointer" },
  successCard: { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:"56px 40px", textAlign:"center", width:"100%", backdropFilter:"blur(12px)" },
  closedBox: { background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:20, padding:"56px 32px", textAlign:"center", width:"100%" },
  closedIcon: { fontSize:48, marginBottom:12 },
  closedTitle: { color:"#f87171", fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:900, margin:"0 0 10px", textTransform:"uppercase" },
  closedMsg: { color:"rgba(255,255,255,0.5)", fontSize:15, lineHeight:1.7 },
  statsRow: { display:"flex", gap:12, marginBottom:20 },
  statBox: { flex:1, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"16px 12px", textAlign:"center", display:"flex", flexDirection:"column", gap:4 },
  statNum: { color:"#fff", fontSize:28, fontWeight:900, fontFamily:"'Barlow Condensed',sans-serif" },
  statLbl: { color:"rgba(255,255,255,0.35)", fontSize:11, fontWeight:600, letterSpacing:1, textTransform:"uppercase" },
  playerCard: { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"16px 18px" },
  playerVerified: { border:"1px solid rgba(74,222,128,0.25)", background:"rgba(74,222,128,0.04)" },
  playerMeta: { display:"flex", flexWrap:"wrap", gap:12, marginTop:10, color:"rgba(255,255,255,0.4)", fontSize:13 },
  posTag: { display:"inline-block", background:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.6)", fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:999, marginLeft:10, verticalAlign:"middle" },
  verifiedTag: { display:"inline-block", background:"rgba(74,222,128,0.12)", color:"#4ade80", fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:999, marginLeft:6, verticalAlign:"middle" },
  iconBtn: { padding:"6px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.7)", fontSize:12, fontWeight:600, cursor:"pointer" },
  proofBox: { marginTop:14, padding:"14px", background:"rgba(0,0,0,0.2)", borderRadius:10, textAlign:"center" },
  toastBanner: { background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.35)", color:"#a3e6b4", fontSize:14, borderRadius:10, padding:"12px 16px", marginBottom:16, textAlign:"center" },
  playerRow: { display:"flex", gap:12, alignItems:"flex-start", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"14px 14px" },
  playerRowNum: { color:"rgba(255,255,255,0.25)", fontWeight:900, fontSize:16, fontFamily:"'Barlow Condensed',sans-serif", paddingTop:10, minWidth:24, textAlign:"center" },
  removeBtn: { background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:14, fontWeight:700, flexShrink:0, marginTop:8 },
  addBtn: { width:"100%", background:"rgba(74,222,128,0.08)", border:"2px dashed rgba(74,222,128,0.3)", color:"#4ade80", fontWeight:700, fontSize:14, borderRadius:12, padding:"13px", cursor:"pointer", marginBottom:4, letterSpacing:0.3 },
  bankCard: { background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:12, padding:"16px 18px", marginBottom:16 },
  bankTitle: { color:"#4ade80", fontWeight:700, fontSize:13, marginBottom:12 },
  bankGrid: { display:"flex", flexDirection:"column", gap:8 },
  bankRow: { display:"flex", justifyContent:"space-between", alignItems:"center" },
  bankKey: { color:"rgba(255,255,255,0.4)", fontSize:12, textTransform:"uppercase", letterSpacing:0.5, fontWeight:600 },
  bankVal: { color:"#fff", fontSize:14, fontWeight:600, fontFamily:"monospace" },
};
