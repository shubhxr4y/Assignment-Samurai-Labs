import type { Request, Response } from 'express';
import * as service from '../services/customer.service.js';
import { created, noContent, ok } from '../utils/response.js';
import type { ListQuery } from '../validators/common.js';

export async function index(req: Request, res: Response) {
  const { rows, total } = await service.listCustomers(req.query as unknown as ListQuery);
  ok(res, rows, { total });
}

export async function show(req: Request, res: Response) {
  ok(res, await service.getCustomer(req.params.id!));
}

export async function store(req: Request, res: Response) {
  created(res, await service.createCustomer(req.body));
}

export async function update(req: Request, res: Response) {
  ok(res, await service.updateCustomer(req.params.id!, req.body));
}

export async function destroy(req: Request, res: Response) {
  await service.deleteCustomer(req.params.id!);
  noContent(res);
}
