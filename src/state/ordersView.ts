/**
 * The Orders register's view — its tab and filters — as they sit in its URL.
 *
 * Remembered here as well so an order's "← Orders" returns to the view it was
 * opened from rather than to the unfiltered register: filter to Past due, open
 * one, come back, and it is still Past due. The design kept these in a global
 * and got that for free.
 */
export interface OrdersView {
  pill?: string
  pr?: string
  cl?: string
  dept?: string
  staff?: string
  due?: string
}

let last: OrdersView = {}

export const rememberOrdersView = (view: OrdersView): void => {
  last = view
}

export const lastOrdersView = (): OrdersView => last
