export type OrdersView = {
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
