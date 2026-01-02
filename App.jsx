import { useEffect, useMemo, useState } from "react";
import "./app.css";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const ESTADOS = ["transporte", "viajes en camino", "viajes concretados"];

function buildQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === "") return;
    qs.set(k, String(v));
  });
  return qs.toString();
}

function toNumberOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function money(n) {
  const num = Number(n ?? 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(num) ? num : 0);
}

function num(n) {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? x.toLocaleString("es-AR") : "0";
}

function formatAnioMes(v) {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{6}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}`; // 202506 -> 2025-06
  return s;
}

const pieColors = ["#111827", "#2563eb", "#16a34a"];

export default function App() {
  const [tab, setTab] = useState("listado"); // "listado" | "cargar" | "dashboard"

  const [transportistas, setTransportistas] = useState([]);
  const [fletes, setFletes] = useState([]);
  const [dash, setDash] = useState(null);

  // filtros listado
  const [estado, setEstado] = useState("");
  const [anioMes, setAnioMes] = useState("");
  const [transportistaId, setTransportistaId] = useState("");
  const [q, setQ] = useState("");

  const [limit, setLimit] = useState(200);
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [nuevoTransportista, setNuevoTransportista] = useState("");
  const [creandoT, setCreandoT] = useState(false);

  // form cargar viaje
  const [form, setForm] = useState({
    estado: "transporte",
    fecha: "",
    dia: "",
    o_carga: "",
    anio_mes: "",
    cliente_destino: "",
    transportista_id: "",
    cod_transporte: "",
    ingrese_transporte: "",
    km: "",
    tn_orden_carga: "",
    tn_cargadas: "",
    aforo: "",
    tarifa_asign: "",
    flete_cobrado: "",
    tarifa_tte: "",
    flete_pagado: "",
    observacion: "",
  });

  const query = useMemo(() => {
    return buildQuery({
      estado,
      anio_mes: anioMes,
      transportista_id: transportistaId ? Number(transportistaId) : "",
      q,
      limit,
      offset,
    });
  }, [estado, anioMes, transportistaId, q, limit, offset]);

  async function loadTransportistas() {
    const res = await fetch("/api/transportistas");
    if (!res.ok) throw new Error("No pude cargar transportistas");
    const data = await res.json();
    setTransportistas(data);
  }

  async function loadFletes() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/fletes?${query}`);
      if (!res.ok) throw new Error("No pude cargar fletes");
      const data = await res.json();
      setFletes(data);
    } catch (e) {
      setMsg(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboard() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("No pude cargar analytics (backend)");
      const data = await res.json();
      setDash(data);
    } catch (e) {
      setMsg(String(e.message || e));
      setDash(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransportistas().catch((e) => setMsg(String(e.message || e)));
  }, []);

  useEffect(() => {
    if (tab === "listado") loadFletes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tab]);

  useEffect(() => {
    if (tab === "dashboard") loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function resetOffset() {
    setOffset(0);
  }

  async function cambiarEstado(o_carga, nuevoEstado) {
    setMsg("");
    try {
      const res = await fetch(`/api/fletes/${encodeURIComponent(o_carga)}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error cambiando estado");
      }
      await loadFletes();
      if (tab === "dashboard") await loadDashboard();
    } catch (e) {
      setMsg(String(e.message || e));
    }
  }

  async function importarExcel(file) {
    setLoading(true);
    setMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import-excel", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error importando Excel");
      }
      const data = await res.json();
      setMsg(
        `✅ Import OK. inserted=${data.inserted} skipped=${data.skipped} hojas=${(data.processed_sheets || []).join(
          ", "
        )}`
      );
      await loadTransportistas();
      if (tab === "listado") await loadFletes();
      if (tab === "dashboard") await loadDashboard();
    } catch (e) {
      setMsg(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  function exportarExcel() {
    window.location.href = "/api/export-excel";
  }

  const transportistaNombre = (id) => {
    const t = transportistas.find((x) => x.id === id);
    return t ? t.nombre : id;
  };

  async function crearTransportista() {
    const nombre = nuevoTransportista.trim();
    if (!nombre) {
      setMsg("Escribí el nombre del transportista");
      return;
    }

    setCreandoT(true);
    setMsg("");
    try {
      const res = await fetch("/api/transportistas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error creando transportista");
      }

      const created = await res.json();

      await loadTransportistas();
      setForm((p) => ({ ...p, transportista_id: String(created.id) }));
      setNuevoTransportista("");
      setMsg("✅ Transportista creado");
    } catch (e) {
      setMsg(String(e.message || e));
    } finally {
      setCreandoT(false);
    }
  }

  async function guardarViaje() {
    setLoading(true);
    setMsg("");
    try {
      if (!form.o_carga.trim()) throw new Error("O.Carga es obligatorio");
      if (!form.transportista_id) throw new Error("Seleccioná un transportista");

      const payload = {
        estado: form.estado,
        fecha: form.fecha ? form.fecha : null,
        dia: form.dia || null,
        o_carga: form.o_carga.trim(),
        anio_mes: form.anio_mes || null,
        cliente_destino: form.cliente_destino || null,
        transportista_id: Number(form.transportista_id),

        cod_transporte: form.cod_transporte || null,
        ingrese_transporte: form.ingrese_transporte || null,

        km: toNumberOrNull(form.km),
        tn_orden_carga: toNumberOrNull(form.tn_orden_carga),
        tn_cargadas: toNumberOrNull(form.tn_cargadas),
        aforo: toNumberOrNull(form.aforo),

        tarifa_asign: toNumberOrNull(form.tarifa_asign),
        flete_cobrado: toNumberOrNull(form.flete_cobrado),
        tarifa_tte: toNumberOrNull(form.tarifa_tte),
        flete_pagado: toNumberOrNull(form.flete_pagado),

        observacion: form.observacion || null,
      };

      const res = await fetch("/api/fletes-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error guardando viaje");
      }

      setMsg("✅ Viaje guardado");

      setForm((prev) => ({
        ...prev,
        fecha: "",
        dia: "",
        o_carga: "",
        anio_mes: "",
        cliente_destino: "",
        cod_transporte: "",
        ingrese_transporte: "",
        km: "",
        tn_orden_carga: "",
        tn_cargadas: "",
        aforo: "",
        tarifa_asign: "",
        flete_cobrado: "",
        tarifa_tte: "",
        flete_pagado: "",
        observacion: "",
      }));

      setTab("listado");
      resetOffset();
      await loadFletes();
    } catch (e) {
      setMsg(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h2 className="title">Logística Conecar</h2>
          <p className="sub">Fletes · Import / Export · Estados · Dashboard</p>
        </div>

        <div className="actions">
          <button className="btn" onClick={exportarExcel}>
            Exportar Excel
          </button>

          <label className="btn" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importarExcel(f);
                e.target.value = "";
              }}
            />
            <span>Importar Excel</span>
          </label>
        </div>
      </div>

      <div className="tabs">
        <button className={`btn ${tab === "listado" ? "active" : ""}`} onClick={() => setTab("listado")}>
          Listado
        </button>
        <button className={`btn ${tab === "cargar" ? "active" : ""}`} onClick={() => setTab("cargar")}>
          Cargar viaje
        </button>
        <button className={`btn ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}>
          Dashboard
        </button>
      </div>

      {msg && (
        <div className="card" style={{ marginTop: 12 }}>
          {msg}
        </div>
      )}

      {/* DASHBOARD */}
      {tab === "dashboard" && (
        <div className="grid" style={{ marginTop: 12 }}>
          {!dash ? (
            <div className="card">{loading ? "Cargando dashboard..." : "No hay datos o falta /api/analytics"}</div>
          ) : (
            <>
              <div className="grid cards">
                <div className="card">
                  <div className="kpiTitle">Viajes</div>
                  <div className="kpiValue">{num(dash.totales?.cantidad ?? 0)}</div>
                </div>
                <div className="card">
                  <div className="kpiTitle">Total cobrado</div>
                  <div className="kpiValue">{money(dash.totales?.cobrado ?? 0)}</div>
                </div>
                <div className="card">
                  <div className="kpiTitle">Total pagado</div>
                  <div className="kpiValue">{money(dash.totales?.pagado ?? 0)}</div>
                </div>
                <div className="card">
                  <div className="kpiTitle">Diferencia</div>
                  <div className="kpiValue">{money(dash.totales?.diferencia ?? 0)}</div>
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr", gap: 12 }}>
                <div className="card">
                  <h3 style={{ marginTop: 0 }}>Evolución por mes</h3>
                  <div style={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dash.por_mes || []}>
                        <XAxis dataKey="anio_mes" tickFormatter={formatAnioMes} />
                        <YAxis />
                        <Tooltip labelFormatter={formatAnioMes} formatter={(v) => money(v)} />
                        <Legend />
                        <Line type="monotone" dataKey="cobrado" stroke="#16a34a" />
                        <Line type="monotone" dataKey="pagado" stroke="#ef4444" />
                        <Line type="monotone" dataKey="diferencia" stroke="#2563eb" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="small">
                    Si falta AÑO.MES en algunos registros, no aparecen en este gráfico.
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ marginTop: 0 }}>Viajes por estado</h3>
                  <div style={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dash.por_estado || []}
                          dataKey="cantidad"
                          nameKey="estado"
                          outerRadius={110}
                          label={(d) => `${d.estado}: ${d.cantidad}`}
                        >
                          {(dash.por_estado || []).map((_, i) => (
                            <Cell key={i} fill={pieColors[i % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => num(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginTop: 0 }}>Resumen por estado</h3>
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Cantidad</th>
                        <th>Cobrado</th>
                        <th>Pagado</th>
                        <th>Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dash.por_estado || []).map((r) => (
                        <tr key={r.estado || "sin-estado"}>
                          <td>{r.estado || "(sin estado)"}</td>
                          <td>{num(r.cantidad)}</td>
                          <td>{money(r.cobrado)}</td>
                          <td>{money(r.pagado)}</td>
                          <td>{money(r.diferencia)}</td>
                        </tr>
                      ))}
                      {(dash.por_estado || []).length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: 12, color: "#666" }}>
                            Sin datos por estado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* CARGAR */}
      {tab === "cargar" && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Cargar viaje</h3>

          <div className="grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            <div>
              <label>Estado *</label>
              <select value={form.estado} onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))}>
                {ESTADOS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Fecha</label>
              <input type="date" value={form.fecha} onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))} />
            </div>

            <div>
              <label>O.Carga *</label>
              <input value={form.o_carga} onChange={(e) => setForm((p) => ({ ...p, o_carga: e.target.value }))} />
            </div>

            <div>
              <label>Año/Mes (YYYY-MM)</label>
              <input value={form.anio_mes} onChange={(e) => setForm((p) => ({ ...p, anio_mes: e.target.value }))} placeholder="2025-03" />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label>Cliente / Destino</label>
              <input value={form.cliente_destino} onChange={(e) => setForm((p) => ({ ...p, cliente_destino: e.target.value }))} />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label>Transportista *</label>

              <select value={form.transportista_id} onChange={(e) => setForm((p) => ({ ...p, transportista_id: e.target.value }))}>
                <option value="">(seleccionar)</option>
                {transportistas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  value={nuevoTransportista}
                  onChange={(e) => setNuevoTransportista(e.target.value)}
                  placeholder="Nuevo transportista…"
                  style={{ flex: 1 }}
                />
                <button className="btn" onClick={crearTransportista} disabled={creandoT}>
                  {creandoT ? "Creando..." : "Agregar"}
                </button>
              </div>

              <div className="small" style={{ marginTop: 6 }}>
                Si no está en la lista, lo agregás acá y queda seleccionado.
              </div>
            </div>

            <div>
              <label>Cod. Transporte</label>
              <input value={form.cod_transporte} onChange={(e) => setForm((p) => ({ ...p, cod_transporte: e.target.value }))} />
            </div>

            <div>
              <label>Ingrese Transporte</label>
              <input value={form.ingrese_transporte} onChange={(e) => setForm((p) => ({ ...p, ingrese_transporte: e.target.value }))} />
            </div>

            <div>
              <label>KM</label>
              <input value={form.km} onChange={(e) => setForm((p) => ({ ...p, km: e.target.value }))} />
            </div>

            <div>
              <label>TN Orden</label>
              <input value={form.tn_orden_carga} onChange={(e) => setForm((p) => ({ ...p, tn_orden_carga: e.target.value }))} />
            </div>

            <div>
              <label>TN Cargadas</label>
              <input value={form.tn_cargadas} onChange={(e) => setForm((p) => ({ ...p, tn_cargadas: e.target.value }))} />
            </div>

            <div>
              <label>Aforo</label>
              <input value={form.aforo} onChange={(e) => setForm((p) => ({ ...p, aforo: e.target.value }))} />
            </div>

            <div>
              <label>Tarifa Asign</label>
              <input value={form.tarifa_asign} onChange={(e) => setForm((p) => ({ ...p, tarifa_asign: e.target.value }))} />
            </div>

            <div>
              <label>Flete Cobrado</label>
              <input value={form.flete_cobrado} onChange={(e) => setForm((p) => ({ ...p, flete_cobrado: e.target.value }))} />
            </div>

            <div>
              <label>Tarifa TTE</label>
              <input value={form.tarifa_tte} onChange={(e) => setForm((p) => ({ ...p, tarifa_tte: e.target.value }))} />
            </div>

            <div>
              <label>Flete Pagado</label>
              <input value={form.flete_pagado} onChange={(e) => setForm((p) => ({ ...p, flete_pagado: e.target.value }))} />
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <label>Observación</label>
              <input value={form.observacion} onChange={(e) => setForm((p) => ({ ...p, observacion: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button className="btn" onClick={guardarViaje} disabled={loading}>
              {loading ? "Guardando..." : "Guardar viaje"}
            </button>
            <button className="btn" onClick={() => setTab("listado")}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* LISTADO */}
      {tab === "listado" && (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <div className="grid" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
              <div>
                <label>Estado</label>
                <select
                  value={estado}
                  onChange={(e) => {
                    setEstado(e.target.value);
                    resetOffset();
                  }}
                >
                  <option value="">(todos)</option>
                  {ESTADOS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Año/Mes</label>
                <input
                  value={anioMes}
                  onChange={(e) => {
                    setAnioMes(e.target.value);
                    resetOffset();
                  }}
                  placeholder="ej: 2025-03"
                />
              </div>

              <div>
                <label>Transportista</label>
                <select
                  value={transportistaId}
                  onChange={(e) => {
                    setTransportistaId(e.target.value);
                    resetOffset();
                  }}
                >
                  <option value="">(todos)</option>
                  {transportistas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Buscar</label>
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    resetOffset();
                  }}
                  placeholder="O.Carga o cliente/destino"
                />
              </div>

              <div>
                <label>Limit</label>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value || 200));
                    resetOffset();
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
                ◀ Prev
              </button>
              <button className="btn" onClick={() => setOffset(offset + limit)}>
                Next ▶
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            {loading ? (
              <div className="card">Cargando…</div>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      {["Fecha", "O.Carga", "Estado", "Año/Mes", "Cliente/Destino", "Transportista", "Cobrado", "Pagado", "Dif.", "Acción"].map(
                        (h) => (
                          <th key={h}>{h}</th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {fletes.map((f) => (
                      <tr key={f.id}>
                        <td>{f.fecha || ""}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{f.o_carga}</td>
                        <td>{f.estado || ""}</td>
                        <td>{formatAnioMes(f.anio_mes || "")}</td>
                        <td>{f.cliente_destino || ""}</td>
                        <td>{transportistaNombre(f.transportista_id)}</td>
                        <td>{money(f.flete_cobrado ?? 0)}</td>
                        <td>{money(f.flete_pagado ?? 0)}</td>
                        <td>{money(f.diferencia ?? 0)}</td>
                        <td>
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) cambiarEstado(f.o_carga, val);
                              e.target.value = "";
                            }}
                          >
                            <option value="">Mover a…</option>
                            {ESTADOS.map((x) => (
                              <option key={x} value={x}>
                                {x}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}

                    {fletes.length === 0 && (
                      <tr>
                        <td colSpan={10} style={{ padding: 12, color: "#666" }}>
                          No hay resultados con esos filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="small" style={{ marginTop: 10 }}>
            Mostrando {fletes.length} filas · offset {offset}
          </p>
        </>
      )}
    </div>
  );
}
