import { Router } from 'express';
import * as controller from '../controllers/invoice.controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { validate } from '../middleware/validate.js';
import { uuidParam } from '../validators/common.js';
import {
  createInvoiceSchema,
  invoiceListQuery,
  recordPaymentSchema,
  updateInvoiceSchema,
} from '../validators/invoice.validator.js';

export const invoiceRoutes = Router();

invoiceRoutes.get('/', validate(invoiceListQuery, 'query'), asyncHandler(controller.index));
// Must be declared before /:id so "next-number" is not read as an id.
invoiceRoutes.get('/next-number', asyncHandler(controller.nextNumber));
invoiceRoutes.get('/:id', validate(uuidParam, 'params'), asyncHandler(controller.show));
invoiceRoutes.post('/', validate(createInvoiceSchema), asyncHandler(controller.store));
invoiceRoutes.put(
  '/:id',
  validate(uuidParam, 'params'),
  validate(updateInvoiceSchema),
  asyncHandler(controller.update),
);
invoiceRoutes.patch(
  '/:id/payment',
  validate(uuidParam, 'params'),
  validate(recordPaymentSchema),
  asyncHandler(controller.payment),
);
invoiceRoutes.delete('/:id', validate(uuidParam, 'params'), asyncHandler(controller.destroy));
