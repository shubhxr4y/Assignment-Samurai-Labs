import type { Request, Response } from 'express';
import * as service from '../services/report.service.js';
import { ok } from '../utils/response.js';

export async function dashboard(_req: Request, res: Response) {
  ok(res, await service.getDashboard());
}

export async function customerSales(_req: Request, res: Response) {
  const rows = await service.getCustomerSales();
  ok(res, rows, { total: rows.length });
}

export async function itemSales(_req: Request, res: Response) {
  const rows = await service.getItemSales();
  ok(res, rows, { total: rows.length });
}

export async function pendingPayments(_req: Request, res: Response) {
  const rows = await service.getPendingPayments();
  ok(res, rows, { total: rows.length });
}
