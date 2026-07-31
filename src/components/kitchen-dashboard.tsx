"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderStatus, RestaurantOrder } from "@/lib/types";

const API_URL =
  process.env.NEXT_PUBLIC_MENU_API_URL || "http://localhost:3000/api/orders";

function formatPrice(amountInr: number) {
  return `₹${amountInr.toLocaleString("en-IN")}`;
}

function playNewOrderChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    osc2.frequency.setValueAtTime(880, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc1.stop(now + 0.45);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.45);
  } catch {
    // Ignore audio context restrictions
  }
}

function getElapsedMinutes(isoTimestamp: string) {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins === 0) return "Just now";
  if (mins === 1) return "1 min ago";
  return `${mins} mins ago`;
}

export function KitchenDashboard() {
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Staff Authentication State
  const [staffKey, setStaffKey] = useState<string>("");
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  const previousOrderCountRef = useRef<number | null>(null);

  const verifyKey = useCallback(async (keyToTest: string) => {
    setAuthChecking(true);
    try {
      const res = await fetch(`${API_URL}?verifyStaff=true`, {
        headers: { "x-kitchen-key": keyToTest }
      });
      if (res.ok) {
        setIsAuthorized(true);
        setStaffKey(keyToTest);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("kitchen_staff_key", keyToTest);
        }
      } else {
        setIsAuthorized(false);
      }
    } catch {
      setIsAuthorized(false);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("kitchen_staff_key") || "8899";
      void verifyKey(stored);
    }
  }, [verifyKey]);

  const fetchOrders = useCallback(async () => {
    if (!staffKey) return;
    try {
      const res = await fetch(API_URL, {
        cache: "no-store",
        headers: { "x-kitchen-key": staffKey }
      });
      if (!res.ok) return;
      const data = (await res.json()) as { orders?: RestaurantOrder[] };
      const fetchedOrders = data.orders ?? [];

      if (
        previousOrderCountRef.current !== null &&
        fetchedOrders.length > previousOrderCountRef.current &&
        soundEnabled
      ) {
        playNewOrderChime();
      }

      previousOrderCountRef.current = fetchedOrders.length;
      setOrders(fetchedOrders);
    } catch {
      // Ignore polling errors
    } finally {
      setLoading(false);
    }
  }, [staffKey, soundEnabled]);

  useEffect(() => {
    if (!isAuthorized) return;
    void fetchOrders();
    const interval = setInterval(() => {
      void fetchOrders();
    }, 4000);
    return () => clearInterval(interval);
  }, [isAuthorized, fetchOrders]);

  async function updateOrderStatus(orderId: string, nextStatus: OrderStatus) {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(API_URL, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-kitchen-key": staffKey
        },
        body: JSON.stringify({ orderId, status: nextStatus })
      });

      if (res.ok) {
        setOrders((prev) =>
          prev.map((ord) => (ord.orderId === orderId ? { ...ord, status: nextStatus } : ord))
        );
      }
    } catch {
      // Ignore transient errors
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setAuthError("");
    fetch(`${API_URL}?verifyStaff=true`, {
      headers: { "x-kitchen-key": pinInput.trim() }
    })
      .then((res) => {
        if (res.ok) {
          setIsAuthorized(true);
          setStaffKey(pinInput.trim());
          if (typeof window !== "undefined") {
            sessionStorage.setItem("kitchen_staff_key", pinInput.trim());
          }
          setPinInput("");
        } else {
          setAuthError("Invalid Staff PIN. Authorized staff PIN is 8899.");
        }
      })
      .catch(() => setAuthError("Network error verifying PIN. Ensure main API server is running."));
  }

  function handleLockDisplay() {
    setIsAuthorized(false);
    setStaffKey("");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("kitchen_staff_key");
    }
  }

  if (authChecking) {
    return (
      <div className="kitchen-shell kitchen-center">
        <div className="kitchen-empty">
          <p>Verifying kitchen staff authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="kitchen-shell kitchen-center">
        <div className="kitchen-auth-card">
          <div className="kitchen-auth-header">
            <span className="auth-icon">🔒</span>
            <h2>Standalone Mobile Kitchen Display</h2>
            <p>Access restricted exclusively to authorized kitchen personnel.</p>
          </div>
          <form className="kitchen-auth-form" onSubmit={handlePinSubmit}>
            <label>
              Enter Kitchen Staff PIN / Key
              <input
                type="password"
                placeholder="Enter PIN (Default: 8899)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
              />
            </label>
            {authError ? <p className="auth-error">{authError}</p> : null}
            <button className="kitchen-auth-btn" type="submit">
              Authenticate Staff Access
            </button>
          </form>
          <div className="kitchen-auth-footer">
            <span>API Server: <code>{API_URL}</code></span>
          </div>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => o.status !== "completed");
  const completedOrders = orders.filter((o) => o.status === "completed");
  const displayedOrders = activeTab === "active" ? activeOrders : completedOrders;

  const newCount = orders.filter((o) => o.status === "new").length;
  const prepCount = orders.filter((o) => o.status === "preparing").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;

  return (
    <div className="kitchen-shell">
      <header className="kitchen-header">
        <div className="kitchen-header__brand">
          <span className="kitchen-badge">STANDALONE KITCHEN UNIT</span>
          <div>
            <h1>Mobile Kitchen Display</h1>
            <p>Live Orders & Prep Control Unit · Staff Authenticated</p>
          </div>
        </div>

        <div className="kitchen-header__controls">
          <button
            className={`kitchen-btn ${soundEnabled ? "kitchen-btn--active" : ""}`}
            onClick={() => setSoundEnabled((prev) => !prev)}
            type="button"
          >
            {soundEnabled ? "🔔 Sound On" : "🔕 Muted"}
          </button>
          <button className="kitchen-btn" onClick={() => void fetchOrders()} type="button">
            🔄 Refresh
          </button>
          <button className="kitchen-btn kitchen-btn--lock" onClick={handleLockDisplay} type="button">
            🔒 Lock
          </button>
        </div>
      </header>

      <section className="kitchen-stats">
        <div className="kitchen-stat-card kitchen-stat-card--new">
          <span>New Orders</span>
          <strong>{newCount}</strong>
        </div>
        <div className="kitchen-stat-card kitchen-stat-card--prep">
          <span>Preparing</span>
          <strong>{prepCount}</strong>
        </div>
        <div className="kitchen-stat-card kitchen-stat-card--ready">
          <span>Ready for Table</span>
          <strong>{readyCount}</strong>
        </div>
      </section>

      <div className="kitchen-tabs">
        <button
          className={activeTab === "active" ? "is-active" : ""}
          onClick={() => setActiveTab("active")}
          type="button"
        >
          Active Orders ({activeOrders.length})
        </button>
        <button
          className={activeTab === "completed" ? "is-active" : ""}
          onClick={() => setActiveTab("completed")}
          type="button"
        >
          Completed ({completedOrders.length})
        </button>
      </div>

      <main className="kitchen-content">
        {loading ? (
          <div className="kitchen-empty">
            <p>Loading active kitchen queue...</p>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="kitchen-empty">
            <h3>No {activeTab} orders right now</h3>
            <p>
              {activeTab === "active"
                ? "New orders placed by guests from their table will appear here automatically."
                : "Completed orders will be logged here."}
            </p>
          </div>
        ) : (
          <div className="kitchen-grid">
            {displayedOrders.map((order) => {
              const isBusy = updatingOrderId === order.orderId;
              return (
                <article
                  className={`kitchen-card kitchen-card--${order.status}`}
                  key={order.orderId}
                >
                  <div className="kitchen-card__header">
                    <div className="kitchen-card__location">
                      <span className="location-label">Table</span>
                      <strong className="location-code">{order.location}</strong>
                    </div>
                    <div className="kitchen-card__meta">
                      <span className={`status-badge status-badge--${order.status}`}>
                        {order.status.toUpperCase()}
                      </span>
                      <span className="time-ago">{getElapsedMinutes(order.createdAt)}</span>
                    </div>
                  </div>

                  <div className="kitchen-card__customer">
                    <div>
                      <strong>{order.customerName}</strong>
                      <span>{order.mobileNumber}</span>
                    </div>
                    <span className="order-id">#{order.orderId}</span>
                  </div>

                  <ul className="kitchen-card__items">
                    {order.items.map((item, index) => (
                      <li key={`${item.dishId}-${index}`}>
                        <div className="item-main">
                          <span className="item-qty">{item.quantity}×</span>
                          <span className="item-name">{item.dishName}</span>
                        </div>
                        <div className="item-details">
                          <span className={`portion-tag portion-tag--${item.plateSize}`}>
                            {item.plateSize} plate
                          </span>
                          <span className="item-price">{formatPrice(item.unitPriceInr * item.quantity)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="kitchen-card__footer">
                    <div className="kitchen-card__total">
                      <span>Total Paid</span>
                      <strong>{formatPrice(order.totalInr)}</strong>
                      <span className="payment-tag">{order.paymentMethod?.toUpperCase() ?? "PAID"}</span>
                    </div>

                    <div className="kitchen-card__actions">
                      {order.status === "new" ? (
                        <button
                          className="action-btn action-btn--prep"
                          disabled={isBusy}
                          onClick={() => void updateOrderStatus(order.orderId, "preparing")}
                          type="button"
                        >
                          {isBusy ? "Updating..." : "▶ Start Prep"}
                        </button>
                      ) : order.status === "preparing" ? (
                        <button
                          className="action-btn action-btn--ready"
                          disabled={isBusy}
                          onClick={() => void updateOrderStatus(order.orderId, "ready")}
                          type="button"
                        >
                          {isBusy ? "Updating..." : "✓ Mark Ready"}
                        </button>
                      ) : order.status === "ready" ? (
                        <button
                          className="action-btn action-btn--complete"
                          disabled={isBusy}
                          onClick={() => void updateOrderStatus(order.orderId, "completed")}
                          type="button"
                        >
                          {isBusy ? "Updating..." : "✔ Complete Order"}
                        </button>
                      ) : (
                        <span className="completed-stamp">✔ Served</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
