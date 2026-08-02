export type PlateSize = "half" | "full";

export type OrderStatus = "new" | "preparing" | "ready" | "completed";

export type PaymentMethod = "upi" | "card" | "netbanking" | "desk";

export interface OrderItem {
  dishId: string;
  dishName: string;
  plateSize: PlateSize;
  quantity: number;
  unitPriceInr: number;
}

export interface RestaurantOrder {
  orderId: string;
  customerToken?: string;
  transactionId?: string;
  paymentSignature?: string;
  tableNumber: string;
  chairCode?: string;
  location: string;
  customerName: string;
  mobileNumber: string;
  items: OrderItem[];
  totalInr: number;
  status: OrderStatus;
  paymentStatus: "paid";
  paymentMethod?: PaymentMethod;
  utrNumber?: string;
  payeeUpi?: string;
  createdAt: string;
}
