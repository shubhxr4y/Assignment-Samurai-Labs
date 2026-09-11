import type { Request, Response } from 'express';
import * as service from '../services/invoice.service.js';
import { created, noContent, ok } from '../utils/response.js';
import type { InvoiceListQuery } from '../validators/invoice.validator.js';

export async function index(req: Request, res: Response) {
  const { rows, total } = await service.listInvoices(req.query as unknown as InvoiceListQuery);
  ok(res, rows, { total });
}

export async function nextNumber(req: Request, res: Response) {
  ok(res, await service.suggestInvoiceNumber(req.query.date as string | undefined));
}

export async function show(req: Request, res: Response) {
  ok(res, await service.getInvoice(req.params.id!));
}

export async function store(req: Request, res: Response) {
  created(res, await service.createInvoice(req.body));
}

export async function update(req: Request, res: Response) {
  ok(res, await service.updateInvoice(req.params.id!, req.body));
}

export async function payment(req: Request, res: Response) {
  ok(res, await service.recordPayment(req.params.id!, req.body));
}

export async function destroy(req: Request, res: Response) {
  await service.deleteInvoice(req.params.id!);
  noContent(res);
}
