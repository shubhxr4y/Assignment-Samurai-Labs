import type { Request, Response } from 'express';
import * as service from '../services/item.service.js';
import { created, noContent, ok } from '../utils/response.js';
import type { ListQuery } from '../validators/common.js';

export async function index(req: Request, res: Response) {
  const { rows, total } = await service.listItems(req.query as unknown as ListQuery);
  ok(res, rows, { total });
}

export async function show(req: Request, res: Response) {
  ok(res, await service.getItem(req.params.id!));
}

export async function invoices(req: Request, res: Response) {
  ok(res, await service.getItemSalesHistory(req.params.id!));
}

export async function store(req: Request, res: Response) {
  created(res, await service.createItem(req.body));
}

export async function update(req: Request, res: Response) {
  ok(res, await service.updateItem(req.params.id!, req.body));
}

export async function destroy(req: Request, res: Response) {
  await service.deleteItem(req.params.id!);
  noContent(res);
}
