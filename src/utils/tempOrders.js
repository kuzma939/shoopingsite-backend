import fs from 'fs';
import path from 'path';

const TEMP_ORDERS_PATH = path.join('./tempOrders.json');

export function readTempOrders() {
  try {
    return JSON.parse(fs.readFileSync(TEMP_ORDERS_PATH, 'utf-8'));
  } catch (e) {
    return {};
  }
}

export function saveTempOrders(data) {
  fs.writeFileSync(TEMP_ORDERS_PATH, JSON.stringify(data, null, 2));
}

export function getOrderById(orderId) {
  const orders = readTempOrders();
  return orders[orderId];
}

export function deleteOrderById(orderId) {
  const orders = readTempOrders();
  delete orders[orderId];
  saveTempOrders(orders);
}
